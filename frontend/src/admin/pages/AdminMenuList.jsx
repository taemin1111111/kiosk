import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBoCategories, getBoMenus, getBoMenuDetail, getBoOptionGroups, patchBoMenuBest, patchBoMenuOptionGroups } from '../../api';

function formatWon(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('ko-KR')}원`;
}

export default function AdminMenuList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(''); // '' = 전체
  const [menus, setMenus] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bestSaving, setBestSaving] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionGroupToAdd, setOptionGroupToAdd] = useState('');
  const [optionSaving, setOptionSaving] = useState(false);

  const activeCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(activeCategoryId)),
    [categories, activeCategoryId]
  );

  const refreshDetail = async (menuId) => {
    if (!menuId) return;
    setDetailLoading(true);
    const d = await getBoMenuDetail(menuId);
    if (d?.ok) setDetail(d.data);
    setDetailLoading(false);
  };

  const loadMenus = async (categoryId = '') => {
    setLoading(true);
    const res = await getBoMenus({ category_id: categoryId ? Number(categoryId) : undefined });
    const list = res?.ok ? res.data || [] : [];
    setMenus(list);

    const firstId = list?.[0]?.id ?? null;
    setSelectedMenuId(firstId);
    setDetail(null);
    setLoading(false);

    if (firstId) {
      setOptionsOpen(false);
      setOptionGroupToAdd('');
      await refreshDetail(firstId);
    }
  };

  const selectMenu = async (menuId) => {
    if (!menuId) return;
    setSelectedMenuId(menuId);
    setDetail(null);
    setOptionsOpen(false);
    setOptionGroupToAdd('');
    await refreshDetail(menuId);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [catRes, optRes] = await Promise.all([getBoCategories(), getBoOptionGroups()]);
      if (!cancelled && catRes?.ok) setCategories(catRes.data || []);
      if (!cancelled && optRes?.ok) setOptionGroups(optRes.data || []);
      if (!cancelled) await loadMenus('');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTabClick = async (categoryId) => {
    setActiveCategoryId(categoryId);
    await loadMenus(categoryId);
  };

  const toggleBest = async (checked) => {
    if (!detail?.id || bestSaving) return;
    setBestSaving(true);
    const res = await patchBoMenuBest(detail.id, checked ? 1 : 0).catch(() => ({ ok: false }));
    if (res?.ok) {
      setDetail((prev) => (prev ? { ...prev, is_best: checked ? 1 : 0 } : prev));
    }
    setBestSaving(false);
  };

  const saveOptionGroups = async (menuId, nextIds) => {
    if (!menuId || optionSaving) return;
    setOptionSaving(true);
    const res = await patchBoMenuOptionGroups(menuId, nextIds).catch(() => ({ ok: false }));
    setOptionSaving(false);
    if (res?.ok) await refreshDetail(menuId);
  };

  const addOptionGroup = async () => {
    const menuId = detail?.id;
    const groupId = Number(optionGroupToAdd);
    if (!menuId || !groupId) return;
    const current = (detail.option_groups || []).map((g) => Number(g.group_id));
    if (current.includes(groupId)) return;
    const next = [...current, groupId];
    await saveOptionGroups(menuId, next);
    setOptionGroupToAdd('');
  };

  const removeOptionGroup = async (groupId) => {
    const menuId = detail?.id;
    if (!menuId) return;
    const current = (detail.option_groups || []).map((g) => Number(g.group_id));
    const next = current.filter((id) => Number(id) !== Number(groupId));
    await saveOptionGroups(menuId, next);
  };

  return (
    <div className="admin-menu-list">
      <div className="admin-menu-list__head">
        <div className="admin-menu-list__headLeft">
          <p className="admin-dashboard__breadcrumb">메뉴관리</p>
          <h1 className="admin-dashboard__title">메뉴 리스트</h1>
          <p className="admin-dashboard__summary">
            총 <span className="admin-dashboard__summaryNum">{menus.length}</span>개의
            <br />
            메뉴가 있습니다.
          </p>
        </div>
      </div>

      <div className="admin-menu-list__layout">
        <div className="admin-menu-list__tabsRow">
          <div className="admin-menu-list__tabs">
            <button
              type="button"
              className={`admin-menu-list__tab ${activeCategoryId === '' ? 'admin-menu-list__tab--active' : ''}`}
              onClick={() => onTabClick('')}
            >
              전체
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`admin-menu-list__tab ${String(activeCategoryId) === String(c.id) ? 'admin-menu-list__tab--active' : ''}`}
                onClick={() => onTabClick(String(c.id))}
                title={c.name_ko}
              >
                {c.name_ko}
              </button>
            ))}
            <button type="button" className="admin-menu-list__tab admin-menu-list__tab--add" onClick={() => navigate('/admin/menus/register')} aria-label="메뉴 추가">
              +
            </button>
          </div>
        </div>

        <section className="admin-menu-list__left">
          {loading ? (
            <p className="admin-menu-list__loading">로딩 중...</p>
          ) : (
            <div className="admin-menu-list__grid">
              {menus.map((m) => (
                <div key={m.id} className="admin-menu-list__cardWrap">
                  <span className="admin-menu-list__drag" aria-hidden>
                    ≡
                  </span>
                  <button
                    type="button"
                    className={`admin-menu-list__card ${Number(selectedMenuId) === Number(m.id) ? 'admin-menu-list__card--selected' : ''}`}
                    onClick={() => selectMenu(m.id)}
                    aria-label={`${m.name_ko} 선택`}
                  >
                    <div className="admin-menu-list__thumbWrap">
                      {m.image_url ? (
                        <img className="admin-menu-list__thumb" src={m.image_url} alt={m.name_ko} />
                      ) : (
                        <div className="admin-menu-list__thumbPlaceholder" />
                      )}
                    </div>
                    <div className="admin-menu-list__cardText">
                      <p className="admin-menu-list__name">{m.name_ko}</p>
                      <p className="admin-menu-list__price">{formatWon(m.base_price)}</p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="admin-menu-list__right">
          {detailLoading ? (
            <p className="admin-menu-list__loading">로딩 중...</p>
          ) : detail ? (
            <div className="admin-menu-list__detail">
              <div className="admin-menu-list__detailImageWrap">
                <div className="admin-menu-list__detailActions">
                  <button type="button" className="admin-menu-list__iconAction" aria-label="수정" onClick={() => navigate(`/admin/menus/${detail.id}/edit`)}>
                    ✎
                  </button>
                  <button type="button" className="admin-menu-list__iconAction admin-menu-list__iconAction--danger" aria-label="삭제">
                    🗑
                  </button>
                </div>
                {detail.images?.[0]?.image_url ? (
                  <img className="admin-menu-list__detailImage" src={detail.images[0].image_url} alt={detail.name_ko} />
                ) : (
                  <div className="admin-menu-list__detailImagePlaceholder" />
                )}
              </div>

              <div className="admin-menu-list__detailBody">
                <div className="admin-menu-list__chipRow">
                  <span className="admin-menu-list__chip">{activeCategory?.name_ko || detail.category_name || '카테고리'}</span>
                </div>

                <div className="admin-menu-list__detailText">
                  <h2 className="admin-menu-list__detailTitle">{detail.name_ko}</h2>
                  {detail.name_en ? <p className="admin-menu-list__detailSub">{detail.name_en}</p> : null}
                  {detail.description ? <p className="admin-menu-list__detailDesc">{detail.description}</p> : null}
                  <p className="admin-menu-list__detailPrice">{formatWon(detail.base_price)}</p>
                </div>

                <label className="admin-menu-list__bestRow">
                  <span className="admin-menu-list__bestText">베스트 메뉴로 지정</span>
                  <input
                    type="checkbox"
                    className="admin-menu-list__bestCheck"
                    checked={Number(detail.is_best) === 1}
                    disabled={bestSaving}
                    onChange={(e) => toggleBest(e.target.checked)}
                  />
                </label>

                <div className="admin-menu-list__options">
                  <div className="admin-menu-list__optionsHead">
                    <span className="admin-menu-list__optionsTitle">옵션</span>
                    <button type="button" className="admin-menu-list__optionsPlus" aria-label="옵션 추가" onClick={() => setOptionsOpen(true)}>
                      +
                    </button>
                  </div>
                  <div className="admin-menu-list__optionsLine" aria-hidden />

                  {optionsOpen && (
                    <div className="admin-menu-list__optionsEditor">
                      <select className="admin-menu-register__select" value={optionGroupToAdd} onChange={(e) => setOptionGroupToAdd(e.target.value)} aria-label="옵션 그룹 선택">
                        <option value="">옵션 그룹 선택</option>
                        {optionGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name_ko}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="admin-menu-register__inputBtn" onClick={addOptionGroup} disabled={optionSaving}>
                        추가
                      </button>
                    </div>
                  )}

                  {(detail.option_groups || []).length > 0 ? (
                    <ul className="admin-menu-register__optionList admin-menu-list__optionsList">
                      {detail.option_groups.map((g) => (
                        <li key={g.group_id}>
                          {g.name_ko}
                          <button type="button" className="admin-menu-register__iconBtn" onClick={() => removeOptionGroup(g.group_id)} aria-label="제거" disabled={optionSaving}>
                            삭제
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-menu-list__optionsEmpty">옵션을 추가해 주세요</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="admin-menu-list__empty">메뉴를 선택해 주세요.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

