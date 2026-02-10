import { pool } from '../db.js';

/** GET /bo/categories - 카테고리 드롭다운 (menus.category_id) */
export async function getCategories(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name_ko, code FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getCategories:', err);
    res.status(500).json({ ok: false, message: '카테고리 조회 실패' });
  }
}

/** GET /bo/option-groups - 옵션 그룹 드롭다운 (menu_option_groups.group_id) */
export async function getOptionGroups(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name_ko, code, select_type, is_required FROM option_groups WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getOptionGroups:', err);
    res.status(500).json({ ok: false, message: '옵션 그룹 조회 실패' });
  }
}

/** GET /bo/option-groups/:id/items - 선택된 그룹의 옵션 항목 (option_items) */
export async function getOptionItems(req, res) {
  try {
    const groupId = Number(req.params.id);
    if (!groupId) {
      return res.status(400).json({ ok: false, message: 'group id 필요' });
    }
    const [rows] = await pool.execute(
      `SELECT id, group_id, name_ko, name_en, extra_price FROM option_items WHERE group_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC`,
      [groupId]
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getOptionItems:', err);
    res.status(500).json({ ok: false, message: '옵션 항목 조회 실패' });
  }
}

/** GET /bo/nutrition-categories - 영양정보 카테고리 드롭다운 */
export async function getNutritionCategories(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, code, name_ko, unit, sort_order
       FROM nutrition_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getNutritionCategories:', err);
    res.status(500).json({ ok: false, message: '영양정보 카테고리 조회 실패' });
  }
}

/**
 * POST /bo/menus - 메뉴 등록 (트랜잭션)
 * body: {
 *   category_id, name_ko, name_en, base_price, description, ingredients, is_best?,
 *   images: [{ image_url, is_main, sort_order }],
 *   nutritions?: [{ category_id, value }],
 *   option_group_ids?: number[]  // 이 메뉴에 붙일 option_groups.id 배열 (순서 = sort_order)
 * }
 */
export async function createMenu(req, res) {
  const conn = await pool.getConnection();
  try {
    const {
      category_id,
      name_ko,
      name_en,
      base_price,
      description,
      ingredients,
      is_best = 0,
      images = [],
      nutritions = [],
      option_group_ids = [],
    } = req.body;

    if (!category_id || !name_ko?.trim()) {
      return res.status(400).json({ ok: false, message: '카테고리와 상품명(한글)은 필수입니다.' });
    }

    await conn.beginTransaction();

    const [menuResult] = await conn.execute(
      `INSERT INTO menus (category_id, name_ko, name_en, description, ingredients, base_price, is_best, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        Number(category_id),
        name_ko.trim(),
        (name_en || '').trim() || null,
        (description || '').trim() || null,
        (ingredients || '').trim() || null,
        Number(base_price) || 0,
        is_best ? 1 : 0,
      ]
    );
    const menuId = menuResult.insertId;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img?.image_url) {
        await conn.execute(
          `INSERT INTO menu_images (menu_id, image_url, is_main, sort_order) VALUES (?, ?, ?, ?)`,
          [menuId, img.image_url, img.is_main ? 1 : 0, img.sort_order ?? i]
        );
      }
    }

    // 새 영양정보 구조: menu_nutritions에 여러 행 INSERT
    if (Array.isArray(nutritions) && nutritions.length > 0) {
      for (let i = 0; i < nutritions.length; i++) {
        const n = nutritions[i];
        const categoryId = Number(n?.category_id);
        const value = String(n?.value ?? '').trim();
        if (!categoryId || !value) continue;
        await conn.execute(
          `INSERT INTO menu_nutritions (menu_id, category_id, value) VALUES (?, ?, ?)`,
          [menuId, categoryId, value]
        );
      }
    }

    for (let i = 0; i < option_group_ids.length; i++) {
      const groupId = Number(option_group_ids[i]);
      if (groupId) {
        await conn.execute(
          `INSERT INTO menu_option_groups (menu_id, group_id, sort_order) VALUES (?, ?, ?)`,
          [menuId, groupId, i]
        );
      }
    }

    await conn.commit();
    conn.release();
    res.status(201).json({ ok: true, message: '메뉴가 등록되었습니다.', menuId });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('createMenu:', err);
    res.status(500).json({ ok: false, message: '메뉴 등록 중 오류가 발생했습니다.' });
  }
}

/** POST /bo/upload/menu-image - 메뉴 이미지 업로드 (multer로 저장된 파일명 기반 URL 반환) */
export async function uploadMenuImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: '업로드할 이미지 파일이 없습니다.' });
    }
    // DB에는 상대경로로 저장 (환경별로 /uploads 정적서빙)
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({ ok: true, data: { image_url: imageUrl } });
  } catch (err) {
    console.error('uploadMenuImage:', err);
    return res.status(500).json({ ok: false, message: '이미지 업로드 실패' });
  }
}

/** GET /bo/menus - 메뉴 리스트 (카테고리 필터 optional) */
export async function getMenus(req, res) {
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
        c.name_ko AS category_name,
        m.name_ko,
        m.name_en,
        m.description,
        m.base_price,
        (
          SELECT mi.image_url
          FROM menu_images mi
          WHERE mi.menu_id = m.id
          ORDER BY mi.is_main DESC, mi.sort_order ASC, mi.id ASC
          LIMIT 1
        ) AS image_url
      FROM menus m
      LEFT JOIN categories c ON c.id = m.category_id
      ${where}
      ORDER BY m.id DESC
      `,
      params
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getMenus:', err);
    res.status(500).json({ ok: false, message: '메뉴 리스트 조회 실패' });
  }
}

/** GET /bo/menus/:id - 메뉴 상세 */
export async function getMenuDetail(req, res) {
  try {
    const menuId = Number(req.params.id);
    if (!menuId) return res.status(400).json({ ok: false, message: 'menu id 필요' });

    const [menus] = await pool.execute(
      `
      SELECT
        m.id,
        m.category_id,
        c.name_ko AS category_name,
        m.name_ko,
        m.name_en,
        m.description,
        m.ingredients,
        m.base_price,
        m.is_best,
        m.is_active
      FROM menus m
      LEFT JOIN categories c ON c.id = m.category_id
      WHERE m.id = ?
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

    const [optionGroups] = await pool.execute(
      `
      SELECT mog.group_id, og.name_ko, mog.sort_order
      FROM menu_option_groups mog
      JOIN option_groups og ON og.id = mog.group_id
      WHERE mog.menu_id = ?
      ORDER BY mog.sort_order ASC, mog.id ASC
      `,
      [menuId]
    );

    res.json({
      ok: true,
      data: {
        ...menu,
        images,
        nutritions,
        option_groups: optionGroups,
      },
    });
  } catch (err) {
    console.error('getMenuDetail:', err);
    res.status(500).json({ ok: false, message: '메뉴 상세 조회 실패' });
  }
}

/** PATCH /bo/menus/:id/best - 베스트 메뉴 지정/해제 */
export async function updateMenuBest(req, res) {
  try {
    const menuId = Number(req.params.id);
    const is_best = req.body?.is_best ? 1 : 0;
    if (!menuId) return res.status(400).json({ ok: false, message: 'menu id 필요' });

    const [result] = await pool.execute(`UPDATE menus SET is_best = ? WHERE id = ?`, [is_best, menuId]);
    if (result.affectedRows === 0) return res.status(404).json({ ok: false, message: '메뉴를 찾을 수 없습니다.' });
    return res.json({ ok: true, message: '저장되었습니다.' });
  } catch (err) {
    console.error('updateMenuBest:', err);
    return res.status(500).json({ ok: false, message: '베스트 메뉴 저장 실패' });
  }
}

/** PATCH /bo/menus/:id/option-groups - 메뉴 옵션 그룹 교체 */
export async function updateMenuOptionGroups(req, res) {
  const conn = await pool.getConnection();
  try {
    const menuId = Number(req.params.id);
    if (!menuId) return res.status(400).json({ ok: false, message: 'menu id 필요' });
    const option_group_ids = Array.isArray(req.body?.option_group_ids) ? req.body.option_group_ids : [];

    await conn.beginTransaction();

    const [exists] = await conn.execute(`SELECT id FROM menus WHERE id = ? LIMIT 1`, [menuId]);
    if (!exists?.[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ ok: false, message: '메뉴를 찾을 수 없습니다.' });
    }

    await conn.execute(`DELETE FROM menu_option_groups WHERE menu_id = ?`, [menuId]);

    for (let i = 0; i < option_group_ids.length; i++) {
      const groupId = Number(option_group_ids[i]);
      if (!groupId) continue;
      await conn.execute(
        `INSERT INTO menu_option_groups (menu_id, group_id, sort_order) VALUES (?, ?, ?)`,
        [menuId, groupId, i]
      );
    }

    await conn.commit();
    conn.release();
    return res.json({ ok: true, message: '저장되었습니다.' });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('updateMenuOptionGroups:', err);
    return res.status(500).json({ ok: false, message: '옵션 저장 실패' });
  }
}

/** PATCH /bo/menus/:id - 메뉴 기본정보/이미지/영양/옵션 수정 (등록 payload와 동일 구조) */
export async function updateMenu(req, res) {
  const conn = await pool.getConnection();
  try {
    const menuId = Number(req.params.id);
    if (!menuId) return res.status(400).json({ ok: false, message: 'menu id 필요' });

    const {
      category_id,
      name_ko,
      name_en,
      base_price,
      description,
      ingredients,
      images = [],
      nutritions = [],
      option_group_ids = [],
    } = req.body;

    if (!category_id || !name_ko?.trim()) {
      return res.status(400).json({ ok: false, message: '카테고리와 상품명(한글)은 필수입니다.' });
    }

    await conn.beginTransaction();

    const [exists] = await conn.execute(`SELECT id FROM menus WHERE id = ? LIMIT 1`, [menuId]);
    if (!exists?.[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ ok: false, message: '메뉴를 찾을 수 없습니다.' });
    }

    await conn.execute(
      `UPDATE menus
       SET category_id = ?, name_ko = ?, name_en = ?, description = ?, ingredients = ?, base_price = ?
       WHERE id = ?`,
      [
        Number(category_id),
        name_ko.trim(),
        (name_en || '').trim() || null,
        (description || '').trim() || null,
        (ingredients || '').trim() || null,
        Number(base_price) || 0,
        menuId,
      ]
    );

    // 이미지 교체
    await conn.execute(`DELETE FROM menu_images WHERE menu_id = ?`, [menuId]);
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img?.image_url) {
        await conn.execute(
          `INSERT INTO menu_images (menu_id, image_url, is_main, sort_order) VALUES (?, ?, ?, ?)`,
          [menuId, img.image_url, img.is_main ? 1 : 0, img.sort_order ?? i]
        );
      }
    }

    // 영양정보 교체
    await conn.execute(`DELETE FROM menu_nutritions WHERE menu_id = ?`, [menuId]);
    if (Array.isArray(nutritions) && nutritions.length > 0) {
      for (let i = 0; i < nutritions.length; i++) {
        const n = nutritions[i];
        const categoryId = Number(n?.category_id);
        const value = String(n?.value ?? '').trim();
        if (!categoryId || !value) continue;
        await conn.execute(
          `INSERT INTO menu_nutritions (menu_id, category_id, value) VALUES (?, ?, ?)`,
          [menuId, categoryId, value]
        );
      }
    }

    // 옵션 그룹 교체
    await conn.execute(`DELETE FROM menu_option_groups WHERE menu_id = ?`, [menuId]);
    if (Array.isArray(option_group_ids) && option_group_ids.length > 0) {
      for (let i = 0; i < option_group_ids.length; i++) {
        const groupId = Number(option_group_ids[i]);
        if (!groupId) continue;
        await conn.execute(
          `INSERT INTO menu_option_groups (menu_id, group_id, sort_order) VALUES (?, ?, ?)`,
          [menuId, groupId, i]
        );
      }
    }

    await conn.commit();
    conn.release();
    return res.json({ ok: true, message: '메뉴가 수정되었습니다.', menuId });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error('updateMenu:', err);
    return res.status(500).json({ ok: false, message: '메뉴 수정 중 오류가 발생했습니다.' });
  }
}

/** GET /bo/users - 유저 리스트 (members.role='USER'만) */
export async function getUsers(req, res) {
  try {
    const [rows] = await pool.execute(
      `
      SELECT id, username, name, email, role, created_at
      FROM members
      WHERE role = 'USER'
      ORDER BY created_at DESC, id DESC
      `
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('getUsers:', err);
    res.status(500).json({ ok: false, message: '유저 리스트 조회 실패' });
  }
}

/** GET /bo/service-terms - 서비스 이용약관 (최신 1건) */
export async function getServiceTerms(req, res) {
  try {
    const [rows] = await pool.execute(
      `
      SELECT id, content, updated_at
      FROM service_terms
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `
    );
    res.json({ ok: true, data: rows?.[0] ?? null });
  } catch (err) {
    console.error('getServiceTerms:', err);
    res.status(500).json({ ok: false, message: '서비스 이용약관 조회 실패' });
  }
}

/** POST /bo/service-terms - 서비스 이용약관 저장(새 버전 추가) */
export async function createServiceTerms(req, res) {
  try {
    const content = String(req.body?.content ?? '').trim();
    if (!content) {
      return res.status(400).json({ ok: false, message: '내용을 입력해 주세요.' });
    }

    const [result] = await pool.execute(
      `
      INSERT INTO service_terms (content, updated_at)
      VALUES (?, CURDATE())
      `,
      [content]
    );

    const [rows] = await pool.execute(
      `
      SELECT id, content, updated_at
      FROM service_terms
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.json({ ok: true, message: '업데이트 되었습니다.', data: rows?.[0] ?? null });
  } catch (err) {
    console.error('createServiceTerms:', err);
    return res.status(500).json({ ok: false, message: '서비스 이용약관 저장 실패' });
  }
}

/** GET /bo/privacy-policy - 개인정보 처리방침 (최신 1건) */
export async function getPrivacyPolicy(req, res) {
  try {
    const [rows] = await pool.execute(
      `
      SELECT id, content, updated_at
      FROM privacy_policy
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
      `
    );
    res.json({ ok: true, data: rows?.[0] ?? null });
  } catch (err) {
    console.error('getPrivacyPolicy:', err);
    res.status(500).json({ ok: false, message: '개인정보 처리방침 조회 실패' });
  }
}

/** POST /bo/privacy-policy - 개인정보 처리방침 저장(새 버전 추가) */
export async function createPrivacyPolicy(req, res) {
  try {
    const content = String(req.body?.content ?? '').trim();
    if (!content) {
      return res.status(400).json({ ok: false, message: '내용을 입력해 주세요.' });
    }

    const [result] = await pool.execute(
      `
      INSERT INTO privacy_policy (content, updated_at)
      VALUES (?, CURDATE())
      `,
      [content]
    );

    const [rows] = await pool.execute(
      `
      SELECT id, content, updated_at
      FROM privacy_policy
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.json({ ok: true, message: '업데이트 되었습니다.', data: rows?.[0] ?? null });
  } catch (err) {
    console.error('createPrivacyPolicy:', err);
    return res.status(500).json({ ok: false, message: '개인정보 처리방침 저장 실패' });
  }
}
