import { pool } from '../db.js';

async function getActiveCartId(conn, memberId) {
  const [rows] = await conn.execute(
    `SELECT id FROM carts WHERE member_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
    [memberId]
  );
  return rows?.[0]?.id ? Number(rows[0].id) : 0;
}

async function getOrCreateActiveCartId(conn, memberId) {
  const existing = await getActiveCartId(conn, memberId);
  if (existing) return existing;
  const [result] = await conn.execute(`INSERT INTO carts(member_id, status) VALUES(?, 'ACTIVE')`, [memberId]);
  return Number(result.insertId) || 0;
}

function normalizeOptions(options) {
  const list = Array.isArray(options) ? options : [];
  return list
    .map((o) => ({
      group_id: Number(o?.group_id) || 0,
      item_id: Number(o?.item_id) || 0,
      option_qty: Math.max(1, Number(o?.option_qty) || 1),
    }))
    .filter((o) => o.group_id && o.item_id);
}

/** GET /app/carts/active - ACTIVE 장바구니 조회 (아이템 + 옵션) + 회원 포인트 */
export async function getAppActiveCart(req, res) {
  const memberId = Number(req.user?.userId) || 0;
  if (!memberId) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });

  try {
    const [memberRows] = await pool.execute(
      `SELECT COALESCE(store_point_balance, 0) AS store_point_balance, COALESCE(toss_point_balance, 0) AS toss_point_balance FROM members WHERE id = ? LIMIT 1`,
      [memberId]
    );
    const storePointBalance = Number(memberRows?.[0]?.store_point_balance) || 0;
    const tossPointBalance = Number(memberRows?.[0]?.toss_point_balance) || 0;

    const [carts] = await pool.execute(
      `SELECT id, status, created_at, updated_at FROM carts WHERE member_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
      [memberId]
    );
    const cart = carts?.[0] || null;
    if (!cart?.id) {
      return res.json({
        ok: true,
        data: {
          cart: null,
          items: [],
          summary: { count: 0, total: 0 },
          store_point_balance: storePointBalance,
          toss_point_balance: tossPointBalance,
        },
      });
    }

    const [items] = await pool.execute(
      `
      SELECT
        ci.id,
        ci.menu_id,
        m.category_id,
        m.name_ko AS menu_name_ko,
        m.name_en AS menu_name_en,
        (
          SELECT mi.image_url
          FROM menu_images mi
          WHERE mi.menu_id = m.id
          ORDER BY mi.is_main DESC, mi.sort_order ASC, mi.id ASC
          LIMIT 1
        ) AS image_url,
        ci.qty,
        ci.base_price,
        ci.option_price,
        ci.unit_price,
        ci.total_price,
        ci.created_at
      FROM cart_items ci
      JOIN menus m ON m.id = ci.menu_id
      WHERE ci.cart_id = ?
      ORDER BY ci.id DESC
      `,
      [Number(cart.id)]
    );

    const itemIds = items.map((it) => Number(it.id)).filter(Boolean);
    let optionsByItemId = {};
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      const [optRows] = await pool.execute(
        `
        SELECT
          cio.cart_item_id,
          cio.group_id,
          og.name_ko AS group_name_ko,
          cio.item_id,
          oi.name_ko AS item_name_ko,
          cio.option_qty,
          cio.extra_price
        FROM cart_item_options cio
        JOIN option_groups og ON og.id = cio.group_id
        JOIN option_items oi ON oi.id = cio.item_id
        WHERE cio.cart_item_id IN (${placeholders})
        ORDER BY cio.cart_item_id DESC, cio.id ASC
        `,
        itemIds
      );
      for (const r of optRows) {
        const cartItemId = Number(r.cart_item_id);
        if (!optionsByItemId[cartItemId]) optionsByItemId[cartItemId] = [];
        optionsByItemId[cartItemId].push({
          group_id: Number(r.group_id),
          group_name_ko: r.group_name_ko,
          item_id: Number(r.item_id),
          item_name_ko: r.item_name_ko,
          option_qty: Number(r.option_qty) || 1,
          extra_price: Number(r.extra_price) || 0,
        });
      }
    }

    const normalizedItems = items.map((it) => ({
      id: Number(it.id),
      menu_id: Number(it.menu_id),
      category_id: it.category_id != null ? Number(it.category_id) : null,
      menu_name_ko: it.menu_name_ko,
      menu_name_en: it.menu_name_en || null,
      image_url: it.image_url || null,
      qty: Number(it.qty) || 1,
      base_price: Number(it.base_price) || 0,
      option_price: Number(it.option_price) || 0,
      unit_price: Number(it.unit_price) || 0,
      total_price: Number(it.total_price) || 0,
      created_at: it.created_at,
      options: optionsByItemId[Number(it.id)] || [],
    }));

    const summary = normalizedItems.reduce(
      (acc, it) => {
        acc.count += Number(it.qty) || 0;
        acc.total += Number(it.total_price) || 0;
        return acc;
      },
      { count: 0, total: 0 }
    );

    return res.json({
      ok: true,
      data: {
        cart: { id: Number(cart.id), status: cart.status },
        items: normalizedItems,
        summary,
        store_point_balance: storePointBalance,
        toss_point_balance: tossPointBalance,
      },
    });
  } catch (err) {
    console.error('getAppActiveCart:', err);
    return res.status(500).json({ ok: false, message: '장바구니 조회 실패' });
  }
}

/**
 * POST /app/carts/active/items - 장바구니에 메뉴 담기
 * body: { menu_id:number, qty:number, options:[{group_id,item_id,option_qty?}] }
 */
export async function postAppAddCartItem(req, res) {
  const memberId = Number(req.user?.userId) || 0;
  if (!memberId) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });

  const menuId = Number(req.body?.menu_id) || 0;
  const qty = Math.max(1, Number(req.body?.qty) || 1);
  const options = normalizeOptions(req.body?.options);

  if (!menuId) return res.status(400).json({ ok: false, message: 'menu_id가 필요합니다.' });
  /* 옵션 없이도 담기 가능 (options 빈 배열이면 기본가만 적용) */

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const cartId = await getOrCreateActiveCartId(conn, memberId);
    if (!cartId) {
      await conn.rollback();
      return res.status(500).json({ ok: false, message: '장바구니 생성 실패' });
    }

    const [menus] = await conn.execute(
      `SELECT id, name_ko, base_price FROM menus WHERE id = ? AND is_active = 1 LIMIT 1`,
      [menuId]
    );
    const menu = menus?.[0];
    if (!menu?.id) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: '메뉴를 찾을 수 없습니다.' });
    }
    const basePrice = Number(menu.base_price) || 0;

    // 옵션 검증 + 추가금 합산 (서버에서 계산)
    let optionPrice = 0;
    const validated = [];
    for (const o of options) {
      const [rows] = await conn.execute(
        `
        SELECT
          oi.id,
          oi.group_id,
          oi.extra_price
        FROM option_items oi
        JOIN menu_option_groups mog ON mog.group_id = oi.group_id AND mog.menu_id = ?
        WHERE oi.id = ? AND oi.group_id = ? AND oi.is_active = 1
        LIMIT 1
        `,
        [menuId, o.item_id, o.group_id]
      );
      const it = rows?.[0];
      if (!it?.id) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '유효하지 않은 옵션이 포함되어 있습니다.' });
      }
      const extra = Number(it.extra_price) || 0;
      const n = Math.max(1, Number(o.option_qty) || 1);
      optionPrice += extra * n;
      validated.push({
        group_id: Number(o.group_id),
        item_id: Number(o.item_id),
        option_qty: n,
        extra_price: extra,
      });
    }

    const unitPrice = basePrice + optionPrice;
    const totalPrice = unitPrice * qty;

    const [itemResult] = await conn.execute(
      `
      INSERT INTO cart_items(
        cart_id, menu_id, qty,
        base_price, option_price, unit_price, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [cartId, menuId, qty, basePrice, optionPrice, unitPrice, totalPrice]
    );
    const cartItemId = Number(itemResult.insertId) || 0;
    if (!cartItemId) {
      await conn.rollback();
      return res.status(500).json({ ok: false, message: '장바구니 담기 실패' });
    }

    for (const v of validated) {
      await conn.execute(
        `
        INSERT INTO cart_item_options(cart_item_id, group_id, item_id, option_qty, extra_price)
        VALUES (?, ?, ?, ?, ?)
        `,
        [cartItemId, v.group_id, v.item_id, v.option_qty, v.extra_price]
      );
    }

    await conn.commit();

    return res.status(201).json({
      ok: true,
      data: { cart_id: cartId, cart_item_id: cartItemId },
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error('postAppAddCartItem:', err);
    return res.status(500).json({ ok: false, message: '장바구니 담기 실패' });
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}

/** DELETE /app/carts/active/items - ACTIVE 장바구니 아이템 전체 삭제(초기화) */
export async function deleteAppClearActiveCart(req, res) {
  const memberId = Number(req.user?.userId) || 0;
  if (!memberId) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const cartId = await getActiveCartId(conn, memberId);
    if (!cartId) {
      await conn.commit();
      return res.json({ ok: true });
    }
    await conn.execute(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);
    await conn.commit();
    return res.json({ ok: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error('deleteAppClearActiveCart:', err);
    return res.status(500).json({ ok: false, message: '장바구니 초기화 실패' });
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}

/** PATCH /app/carts/active/items/:id - ACTIVE 장바구니 아이템 수량 변경 */
export async function patchAppUpdateCartItemQty(req, res) {
  const memberId = Number(req.user?.userId) || 0;
  if (!memberId) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });

  const cartItemId = Number(req.params.id) || 0;
  const qty = Math.max(1, Number(req.body?.qty) || 1);
  if (!cartItemId) return res.status(400).json({ ok: false, message: 'cart_item_id가 필요합니다.' });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const cartId = await getActiveCartId(conn, memberId);
    if (!cartId) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: 'ACTIVE 장바구니가 없습니다.' });
    }

    const [rows] = await conn.execute(
      `
      SELECT id, cart_id, unit_price
      FROM cart_items
      WHERE id = ? AND cart_id = ?
      LIMIT 1
      `,
      [cartItemId, cartId]
    );
    const item = rows?.[0];
    if (!item?.id) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: '장바구니 아이템을 찾을 수 없습니다.' });
    }

    const unitPrice = Number(item.unit_price) || 0;
    const totalPrice = unitPrice * qty;

    await conn.execute(`UPDATE cart_items SET qty = ?, total_price = ? WHERE id = ?`, [qty, totalPrice, cartItemId]);
    await conn.commit();

    return res.json({ ok: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error('patchAppUpdateCartItemQty:', err);
    return res.status(500).json({ ok: false, message: '수량 변경 실패' });
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}

/** DELETE /app/carts/active/items/:id - ACTIVE 장바구니 아이템 삭제 */
export async function deleteAppRemoveCartItem(req, res) {
  const memberId = Number(req.user?.userId) || 0;
  if (!memberId) return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });

  const cartItemId = Number(req.params.id) || 0;
  if (!cartItemId) return res.status(400).json({ ok: false, message: 'cart_item_id가 필요합니다.' });

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const cartId = await getActiveCartId(conn, memberId);
    if (!cartId) {
      await conn.commit();
      return res.json({ ok: true });
    }

    await conn.execute(`DELETE FROM cart_items WHERE id = ? AND cart_id = ?`, [cartItemId, cartId]);
    await conn.commit();
    return res.json({ ok: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error('deleteAppRemoveCartItem:', err);
    return res.status(500).json({ ok: false, message: '삭제 실패' });
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}

