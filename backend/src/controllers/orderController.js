import { pool } from '../db.js';

async function getActiveCartId(conn, memberId) {
  const [rows] = await conn.execute(
    `SELECT id FROM carts WHERE member_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
    [memberId]
  );
  return rows?.[0]?.id ? Number(rows[0].id) : 0;
}

function generateOrderNo() {
  const t = new Date().toISOString().replace(/-|T|:|\.|Z/g, '').slice(0, 17);
  const r = Math.random().toString(36).slice(2, 6);
  return `ORD${t}${r}`;
}

const PAYMENT_METHOD_MAP = {
  card: 'CARD',
  simple: 'EASY_PAY',
  cash: 'CASH',
  transfer: 'TRANSFER',
};

const EAT_TYPE_MAP = {
  in: 'IN_STORE',
  takeout: 'TAKE_OUT',
};

/**
 * POST /app/checkout - 결제하기 (트랜잭션)
 * body: { method: 'card'|'simple'|'cash'|'transfer', store_point_used: number, toss_point_used: number, eat_type: 'in'|'takeout' }
 */
export async function postAppCheckout(req, res) {
  const memberId = Number(req.user?.userId) || 0;
  if (!memberId) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });

  const methodKey = req.body?.method;
  const paymentMethod = PAYMENT_METHOD_MAP[methodKey] || 'CARD';
  const storePointUsed = Math.max(0, Number(req.body?.store_point_used) || 0);
  const tossPointUsed = Math.max(0, Number(req.body?.toss_point_used) || 0);
  const eatTypeKey = req.body?.eat_type;
  const eatType = EAT_TYPE_MAP[eatTypeKey] || 'IN_STORE';

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const cartId = await getActiveCartId(conn, memberId);
    if (!cartId) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: '장바구니가 비어 있습니다.' });
    }

    // 장바구니 총액 + 아이템/옵션 스냅샷용 조회
    const [cartItems] = await conn.execute(
      `
      SELECT
        ci.id AS cart_item_id,
        ci.menu_id,
        m.name_ko AS menu_name_ko,
        ci.qty,
        ci.base_price,
        ci.option_price,
        ci.unit_price,
        ci.total_price
      FROM cart_items ci
      JOIN menus m ON m.id = ci.menu_id
      WHERE ci.cart_id = ?
      ORDER BY ci.id ASC
      `,
      [cartId]
    );
    if (!cartItems?.length) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: '장바구니가 비어 있습니다.' });
    }

    const totalAmount = cartItems.reduce((sum, it) => sum + (Number(it.total_price) || 0), 0);
    const payAmount = totalAmount - storePointUsed - tossPointUsed;
    if (payAmount < 0) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: '사용 포인트가 결제 금액을 초과할 수 없습니다.' });
    }

    // 포인트 잔액 검증
    const [memberRows] = await conn.execute(
      `SELECT COALESCE(store_point_balance, 0) AS store_point_balance, COALESCE(toss_point_balance, 0) AS toss_point_balance FROM members WHERE id = ? LIMIT 1`,
      [memberId]
    );
    const storeBalance = Number(memberRows?.[0]?.store_point_balance) || 0;
    const tossBalance = Number(memberRows?.[0]?.toss_point_balance) || 0;
    if (storePointUsed > storeBalance || tossPointUsed > tossBalance) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: '포인트 잔액이 부족합니다.' });
    }

    const orderNo = generateOrderNo();

    // 1) orders 생성
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (order_no, member_id, status, total_amount, paid_at, eat_type, store_point_used, toss_point_used)
       VALUES (?, ?, 'PAID', ?, NOW(), ?, ?, ?)`,
      [orderNo, memberId, totalAmount, eatType, storePointUsed, tossPointUsed]
    );
    const orderId = Number(orderResult.insertId);
    if (!orderId) {
      await conn.rollback();
      return res.status(500).json({ ok: false, message: '주문 생성 실패' });
    }

    const cartItemIds = cartItems.map((it) => Number(it.cart_item_id));

    // 2) order_items 생성 (cart_items 스냅샷)
    for (const it of cartItems) {
      const [oiResult] = await conn.execute(
        `INSERT INTO order_items (order_id, menu_id, menu_name_ko, qty, base_price, option_price, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          it.menu_id,
          it.menu_name_ko || '',
          Number(it.qty) || 1,
          Number(it.base_price) || 0,
          Number(it.option_price) || 0,
          Number(it.unit_price) || 0,
          Number(it.total_price) || 0,
        ]
      );
      const orderItemId = Number(oiResult.insertId);
      if (!orderItemId) {
        await conn.rollback();
        return res.status(500).json({ ok: false, message: '주문 상세 저장 실패' });
      }
      it._order_item_id = orderItemId;
    }

    // 3) order_item_options 생성 (cart_item_options 스냅샷)
    if (cartItemIds.length > 0) {
      const placeholders = cartItemIds.map(() => '?').join(',');
      const [optRows] = await conn.execute(
        `SELECT cio.cart_item_id, og.name_ko AS group_name_ko, oi.name_ko AS item_name_ko, cio.option_qty, cio.extra_price
         FROM cart_item_options cio
         JOIN option_groups og ON og.id = cio.group_id
         JOIN option_items oi ON oi.id = cio.item_id
         WHERE cio.cart_item_id IN (${placeholders})
         ORDER BY cio.cart_item_id, cio.id`,
        cartItemIds
      );
      const cartItemIdToOrderItem = new Map();
      cartItems.forEach((c) => cartItemIdToOrderItem.set(Number(c.cart_item_id), c._order_item_id));
      for (const opt of optRows || []) {
        const orderItemId = cartItemIdToOrderItem.get(Number(opt.cart_item_id));
        if (!orderItemId) continue;
        await conn.execute(
          `INSERT INTO order_item_options (order_item_id, group_name, item_name, option_qty, extra_price)
           VALUES (?, ?, ?, ?, ?)`,
          [
            orderItemId,
            opt.group_name_ko || '',
            opt.item_name_ko || '',
            Number(opt.option_qty) || 1,
            Number(opt.extra_price) || 0,
          ]
        );
      }
    }

    // 4) payments 생성 (amount = total_amount - 포인트, 포인트만 사용 시 0원으로 한 건 저장)
    await conn.execute(
      `INSERT INTO payments (order_id, method, amount, status, approved_at) VALUES (?, ?, ?, 'SUCCESS', NOW())`,
      [orderId, paymentMethod, payAmount]
    );

    // 5) members 포인트 차감 + 매장 포인트 적립 (결제 금액의 10%)
    const pointAccumulation = Math.floor(payAmount * 0.1);
    await conn.execute(
      `UPDATE members SET store_point_balance = store_point_balance - ? + ?, toss_point_balance = toss_point_balance - ? WHERE id = ?`,
      [storePointUsed, pointAccumulation, tossPointUsed, memberId]
    );

    // 6) 장바구니 상태 ORDERED 로 변경
    await conn.execute(`UPDATE carts SET status = 'ORDERED' WHERE id = ?`, [cartId]);

    await conn.commit();

    return res.status(201).json({
      ok: true,
      message: '결제가 완료되었습니다.',
      data: {
        order_id: orderId,
        order_no: orderNo,
        total_amount: totalAmount,
        pay_amount: payAmount,
      },
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error('postAppCheckout:', err);
    return res.status(500).json({ ok: false, message: '결제 처리 중 오류가 발생했습니다.' });
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}

/**
 * GET /app/orders - 내 주문내역 (회원별 주문 목록 + 첫 번째 메뉴/이미지)
 * 쿼리: status (선택), dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD)
 */
export async function getAppOrders(req, res) {
  const memberId = Number(req.user?.userId) || 0;
  if (!memberId) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });

  const status = (req.query.status || '').trim().toUpperCase();
  const dateFrom = (req.query.dateFrom || '').trim();
  const dateTo = (req.query.dateTo || '').trim();

  try {
    const [memberRows] = await pool.execute(
      `SELECT name FROM members WHERE id = ? LIMIT 1`,
      [memberId]
    );
    const memberName = memberRows?.[0]?.name || '';

    const conditions = ['o.member_id = ?'];
    const params = [memberId];
    if (status && status !== 'ALL') {
      conditions.push('o.status = ?');
      params.push(status);
    }
    if (dateFrom) {
      conditions.push('o.paid_at >= ?');
      params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      conditions.push('o.paid_at <= ?');
      params.push(`${dateTo} 23:59:59`);
    }
    const whereClause = conditions.join(' AND ');

    const [orders] = await pool.execute(
      `
      SELECT
        o.id,
        o.order_no,
        o.status,
        o.total_amount,
        o.paid_at AS created_at,
        first_oi.menu_name_ko AS first_menu_name,
        first_oi.qty AS first_qty,
        first_oi.menu_id AS first_menu_id,
        (SELECT COALESCE(SUM(oi2.qty), 0) FROM order_items oi2 WHERE oi2.order_id = o.id) AS item_count
      FROM orders o
      LEFT JOIN (
        SELECT oi.order_id, oi.menu_name_ko, oi.qty, oi.menu_id
        FROM order_items oi
        INNER JOIN (SELECT order_id, MIN(id) AS min_id FROM order_items GROUP BY order_id) t
          ON oi.order_id = t.order_id AND oi.id = t.min_id
      ) first_oi ON o.id = first_oi.order_id
      WHERE ${whereClause}
      ORDER BY o.paid_at DESC
      LIMIT 100
      `,
      params
    );

    const list = [];
    let menuIds = [];
    for (const row of orders || []) {
      const itemCount = Number(row.item_count) || 0;
      list.push({
        id: row.id,
        order_no: row.order_no,
        status: row.status,
        total_amount: Number(row.total_amount) || 0,
        created_at: row.created_at,
        first_menu_name: row.first_menu_name || '',
        first_qty: Number(row.first_qty) || 1,
        first_menu_id: row.first_menu_id ? Number(row.first_menu_id) : null,
        item_count: itemCount > 0 ? itemCount : 1,
      });
      if (row.first_menu_id) menuIds.push(Number(row.first_menu_id));
    }

    menuIds = [...new Set(menuIds)];
    let imageByMenu = {};
    if (menuIds.length > 0) {
      const placeholders = menuIds.map(() => '?').join(',');
      const [imgRows] = await pool.execute(
        `SELECT menu_id, image_url FROM menu_images WHERE menu_id IN (${placeholders}) ORDER BY is_main DESC, id ASC`,
        menuIds
      );
      for (const r of imgRows || []) {
        const mid = Number(r.menu_id);
        if (!imageByMenu[mid]) imageByMenu[mid] = r.image_url || null;
      }
    }

    const ordersWithImage = list.map((o) => ({
      ...o,
      first_image_url: o.first_menu_id ? imageByMenu[o.first_menu_id] || null : null,
    }));

    return res.json({
      ok: true,
      data: {
        member_name: memberName,
        orders: ordersWithImage,
      },
    });
  } catch (err) {
    console.error('getAppOrders:', err);
    return res.status(500).json({ ok: false, message: '주문내역 조회 실패' });
  }
}
