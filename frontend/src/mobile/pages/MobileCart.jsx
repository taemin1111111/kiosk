import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import {
  getAppCategories,
  getAppActiveCart,
  getImageUrl,
  patchAppCartItemQty,
  deleteAppCartItem,
  deleteAppClearCart,
} from '../../api';

const ALL_TAB = { id: 'all', name_ko: '전체' };

export default function MobileCart() {
  const [scale, setScale] = useState(1);
  const [category, setCategory] = useState('all');
  const [categories, setCategories] = useState([ALL_TAB]);
  const [cartItems, setCartItems] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [cartBusyId, setCartBusyId] = useState(0);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const fromMypage = location.state?.from === 'mypage';
  const categoryScrollRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    didDrag: false,
    blockClick: false,
    cleanup: null,
  });

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const fetchCart = async () => {
    const res = await getAppActiveCart().catch(() => ({ ok: false }));
    if (!res?.ok) return;
    setSummary(res.data?.summary || { count: 0, total: 0 });
    setCartItems(Array.isArray(res.data?.items) ? res.data.items : []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [catRes, cartRes] = await Promise.all([
        getAppCategories().catch(() => ({ ok: false })),
        getAppActiveCart().catch(() => ({ ok: false })),
      ]);
      if (cancelled) return;
      const cats = catRes?.ok ? catRes.data || [] : [];
      setCategories([ALL_TAB, ...cats]);
      if (cartRes?.ok) {
        setSummary(cartRes.data?.summary || { count: 0, total: 0 });
        setCartItems(Array.isArray(cartRes.data?.items) ? cartRes.data.items : []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const allSelected = cartItems.length > 0 && selectedIds.size === cartItems.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(cartItems.map((it) => it.id)));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await deleteAppCartItem(id).catch(() => {});
    }
    setSelectedIds(new Set());
    await fetchCart();
  };

  const handleClearAll = async () => {
    const res = await deleteAppClearCart().catch(() => ({ ok: false }));
    if (res?.ok) {
      setSelectedIds(new Set());
      await fetchCart();
    }
  };

  const updateItemQty = async (cartItemId, nextQty) => {
    const id = Number(cartItemId) || 0;
    if (!id || cartBusyId) return;
    setCartBusyId(id);
    try {
      const res = await patchAppCartItemQty(id, Math.max(1, Number(nextQty) || 1)).catch(() => ({ ok: false }));
      if (res?.ok) await fetchCart();
    } finally {
      setCartBusyId(0);
    }
  };

  const removeItem = async (cartItemId) => {
    const id = Number(cartItemId) || 0;
    if (!id || cartBusyId) return;
    setCartBusyId(id);
    try {
      const res = await deleteAppCartItem(id).catch(() => ({ ok: false }));
      if (res?.ok) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await fetchCart();
      }
    } finally {
      setCartBusyId(0);
    }
  };

  const formatOptions = (options) => {
    if (!Array.isArray(options) || options.length === 0) return null;
    return options
      .map((o) => `${o.item_name_ko || ''} ${o.option_qty > 1 ? `×${o.option_qty}` : ''}`.trim())
      .filter(Boolean)
      .join(' | ');
  };

  const onCategoryPointerDown = (e) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    dragStateRef.current.cleanup?.();
    dragStateRef.current.active = true;
    dragStateRef.current.pointerId = e.pointerId;
    dragStateRef.current.startX = e.clientX;
    dragStateRef.current.startScrollLeft = el.scrollLeft;
    dragStateRef.current.didDrag = false;
    dragStateRef.current.blockClick = false;

    const onMove = (ev) => {
      if (!dragStateRef.current.active) return;
      if (dragStateRef.current.pointerId != null && ev.pointerId !== dragStateRef.current.pointerId) return;
      const dx = ev.clientX - dragStateRef.current.startX;
      if (Math.abs(dx) > 10) dragStateRef.current.didDrag = true;
      el.scrollLeft = dragStateRef.current.startScrollLeft - dx;
      if (ev.cancelable) ev.preventDefault();
    };

    const end = (ev) => {
      if (dragStateRef.current.pointerId != null && ev.pointerId !== dragStateRef.current.pointerId) return;
      dragStateRef.current.active = false;
      dragStateRef.current.pointerId = null;
      dragStateRef.current.blockClick = dragStateRef.current.didDrag;
      window.setTimeout(() => {
        dragStateRef.current.blockClick = false;
        dragStateRef.current.didDrag = false;
      }, 0);
      dragStateRef.current.cleanup?.();
      dragStateRef.current.cleanup = null;
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', end, { passive: true });
    window.addEventListener('pointercancel', end, { passive: true });
    dragStateRef.current.cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  };

  useEffect(() => {
    return () => {
      dragStateRef.current.cleanup?.();
      dragStateRef.current.cleanup = null;
    };
  }, []);

  return (
    <div className="figma360-stage figma360-stage--cart">
      <div className="figma360-scale figma360-scale--cart" style={{ '--figma360-scale': String(scale) }}>
        <div className="cart">
          <header className="cart__header">
            <h1 className="cart__title">장바구니</h1>
            <button
              type="button"
              className="cart__close"
              aria-label="닫기"
              onClick={() => navigate(fromMypage ? '/menu/mypage' : '/menu', { replace: true })}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <nav
            ref={categoryScrollRef}
            className="cart__categories"
            onPointerDown={onCategoryPointerDown}
            onPointerMove={() => {}}
            onPointerUp={() => {}}
            onPointerCancel={() => {}}
          >
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cart__category ${category === String(c.id) ? 'cart__category--active' : ''}`}
                onClick={() => {
                  if (dragStateRef.current.blockClick) return;
                  setCategory(String(c.id));
                }}
              >
                {c.name_ko}
              </button>
            ))}
          </nav>

          <section className="cart__section">
            <div className="cart__sectionTitleRow">
              <h2 className="cart__sectionTitle">주문 메뉴</h2>
              <span className="cart__totalCount">총 {summary.count}개</span>
            </div>
            <div className="cart__sectionHead">
              <label className="cart__selectAll">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="전체 선택"
                />
                <span>전체 선택</span>
              </label>
              <div className="cart__actions">
                <button type="button" className="cart__linkBtn" onClick={deleteSelected} disabled={selectedIds.size === 0}>
                  선택삭제
                </button>
                <span className="cart__divider">|</span>
                <button type="button" className="cart__linkBtn" onClick={handleClearAll} disabled={cartItems.length === 0}>
                  전체삭제
                </button>
              </div>
            </div>
          </section>

          <div className="cart__listWrap">
            <div className="cart__list">
              {loading ? (
                <p className="cart__loading">로딩 중...</p>
              ) : (() => {
                const filtered = category === 'all' ? cartItems : cartItems.filter((it) => String(it.category_id) === category);
                if (filtered.length === 0) return <p className="cart__empty">{category === 'all' ? '장바구니에 담긴 메뉴가 없습니다.' : '이 카테고리에 담긴 메뉴가 없습니다.'}</p>;
                return (
              <ul className="cart__items" aria-label="주문 메뉴">
                {filtered.map((it) => (
                  <li key={it.id} className="cart__item">
                    <label className="cart__itemCheck">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(it.id)}
                        onChange={() => toggleSelect(it.id)}
                        aria-label={`${it.menu_name_ko} 선택`}
                      />
                    </label>
                    <div
                      className="cart__itemImg"
                      style={it.image_url ? { backgroundImage: `url(${getImageUrl(it.image_url)})` } : undefined}
                      aria-hidden
                    />
                    <div className="cart__itemBody">
                      <p className="cart__itemNameKo">{it.menu_name_ko}</p>
                      {it.menu_name_en && <p className="cart__itemNameEn">{it.menu_name_en}</p>}
                        {formatOptions(it.options) ? (
                        <div className="cart__itemOptionsWrap">
                          <div className="cart__itemOptions">
                            {(() => {
                              const segs = formatOptions(it.options).split(' | ');
                              const lines = [];
                              for (let i = 0; i < segs.length; i += 3) lines.push(segs.slice(i, i + 3));
                              return lines.map((lineSegs, lineIdx) => (
                                <div key={lineIdx} className="cart__itemOptionsLine">
                                  {lineSegs.map((seg, i) => (
                                    <span key={i}>
                                      {i > 0 && <span className="cart__optionDivider"> | </span>}
                                      {seg}
                                    </span>
                                  ))}
                                </div>
                              ));
                            })()}
                          </div>
                          <button
                            type="button"
                            className="cart__optionChange"
                            onClick={() => navigate(`/menu/${it.menu_id}`, { state: { fromCart: true, cartItem: it } })}
                          >
                            옵션변경
                          </button>
                        </div>
                      ) : null}
                      <div className="cart__itemRow">
                        <div className="cart__itemQty" aria-label="수량">
                          <button
                            type="button"
                            className="cart__itemQtyBtn"
                            aria-label="수량 감소"
                            disabled={cartBusyId === it.id || (it.qty || 1) <= 1}
                            onClick={() => updateItemQty(it.id, (it.qty || 1) - 1)}
                          >
                            -
                          </button>
                          <span className="cart__itemQtyNum">{it.qty || 1}</span>
                          <button
                            type="button"
                            className="cart__itemQtyBtn"
                            aria-label="수량 증가"
                            disabled={cartBusyId === it.id}
                            onClick={() => updateItemQty(it.id, (it.qty || 1) + 1)}
                          >
                            +
                          </button>
                        </div>
                        <p className="cart__itemPrice">{(Number(it.total_price) || 0).toLocaleString('ko-KR')}원</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart__itemDelete"
                      aria-label="삭제"
                      disabled={cartBusyId === it.id}
                      onClick={() => removeItem(it.id)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
                );
              })()}
            </div>
          </div>

          <footer className="cart__footer">
            <div className="cart__footerRow">
              <span className="cart__footerCount">
                {selectedIds.size > 0 ? `선택메뉴 총 ${selectedIds.size}개` : `전체메뉴 총 ${summary.count}개`}
              </span>
              <span className="cart__footerTotal">총 {summary.total.toLocaleString('ko-KR')}원</span>
            </div>
            <button
              type="button"
              className="cart__orderBtn"
              onClick={() => navigate('/menu/checkout')}
            >
              주문하기
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
