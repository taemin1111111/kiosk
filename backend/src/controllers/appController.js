import { pool } from '../db.js';

/** GET /app/categories - 사용자 메뉴 카테고리 탭 */
export async function getAppCategories(_req, res) {
  try {
    const [rows] = await pool.execute(
      `
      SELECT id, code, name_ko
      FROM categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getAppCategories:', err);
    return res.status(500).json({ ok: false, message: '카테고리 조회 실패' });
  }
}

/** GET /app/menus?category_id= - 사용자 홈(상품 리스트) */
export async function getAppMenus(req, res) {
  try {
    const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
    const params = [];
    let where = 'WHERE m.is_active = 1';
    if (categoryId) {
      where += ' AND m.category_id = ?';
      params.push(categoryId);
    }

    const [rows] = await pool.execute(
      `
      SELECT
        m.id,
        m.category_id,
        m.name_ko,
        m.base_price,
        m.is_best,
        (
          SELECT mi.image_url
          FROM menu_images mi
          WHERE mi.menu_id = m.id
          ORDER BY mi.is_main DESC, mi.sort_order ASC, mi.id ASC
          LIMIT 1
        ) AS image_url
      FROM menus m
      ${where}
      ORDER BY m.is_best DESC, m.id DESC
      `,
      params
    );

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getAppMenus:', err);
    return res.status(500).json({ ok: false, message: '메뉴 조회 실패' });
  }
}

/** GET /app/menus/:id - 사용자 상세(옵션 포함) */
export async function getAppMenuDetail(req, res) {
  try {
    const menuId = Number(req.params.id);
    if (!menuId) return res.status(400).json({ ok: false, message: 'menu id 필요' });

    const [menus] = await pool.execute(
      `
      SELECT
        m.id,
        m.category_id,
        m.name_ko,
        m.name_en,
        m.description,
        m.ingredients,
        m.base_price,
        m.is_best
      FROM menus m
      WHERE m.id = ? AND m.is_active = 1
      LIMIT 1
      `,
      [menuId]
    );
    const menu = menus?.[0];
    if (!menu) return res.status(404).json({ ok: false, message: '메뉴를 찾을 수 없습니다.' });

    const [images] = await pool.execute(
      `SELECT id, image_url, is_main, sort_order FROM menu_images WHERE menu_id = ? ORDER BY is_main DESC, sort_order ASC, id ASC`,
      [menuId]
    );

    const [nutritions] = await pool.execute(
      `
      SELECT mn.category_id, nc.code, nc.name_ko, nc.unit, nc.sort_order, mn.value
      FROM menu_nutritions mn
      JOIN nutrition_categories nc ON nc.id = mn.category_id
      WHERE mn.menu_id = ?
      ORDER BY nc.sort_order ASC, mn.id ASC
      `,
      [menuId]
    );

    // 메뉴에 연결된 옵션 그룹 + 아이템들
    const [groupRows] = await pool.execute(
      `
      SELECT mog.group_id, mog.sort_order, og.name_ko, og.code, og.select_type, og.is_required
      FROM menu_option_groups mog
      JOIN option_groups og ON og.id = mog.group_id
      WHERE mog.menu_id = ? AND og.is_active = 1
      ORDER BY mog.sort_order ASC, mog.id ASC
      `,
      [menuId]
    );

    const groupIds = groupRows.map((g) => Number(g.group_id)).filter(Boolean);
    let itemsByGroup = {};
    if (groupIds.length > 0) {
      const placeholders = groupIds.map(() => '?').join(',');
      const [itemRows] = await pool.execute(
        `
        SELECT id, group_id, name_ko, name_en, extra_price, sort_order
        FROM option_items
        WHERE group_id IN (${placeholders}) AND is_active = 1
        ORDER BY group_id ASC, sort_order ASC, id ASC
        `,
        groupIds
      );
      for (const it of itemRows) {
        const gid = Number(it.group_id);
        if (!itemsByGroup[gid]) itemsByGroup[gid] = [];
        itemsByGroup[gid].push(it);
      }
    }

    const option_groups = groupRows.map((g) => ({
      ...g,
      items: itemsByGroup[Number(g.group_id)] || [],
    }));

    return res.json({
      ok: true,
      data: {
        ...menu,
        images,
        nutritions,
        option_groups,
      },
    });
  } catch (err) {
    console.error('getAppMenuDetail:', err);
    return res.status(500).json({ ok: false, message: '메뉴 상세 조회 실패' });
  }
}

