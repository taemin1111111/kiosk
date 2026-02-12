import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { deleteAppCartItem, deleteAppClearCart, getAppActiveCart, getAppCategories, getAppMenus, patchAppCartItemQty } from '../../api';

import logoSvg from '../../assets/Vector.svg';
import replaySvg from '../../assets/replay.svg';
import iconCartSvg from '../../assets/icon-cart.svg';

const ALL_TAB = { id: 'all', name_ko: '전체' };

export default function MobileMenu() {
  const [scale, setScale] = useState(1);
  const [category, setCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [categories, setCategories] = useState([ALL_TAB]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartBusyId, setCartBusyId] = useState(0);
  const [emptyCartModalOpen, setEmptyCartModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const footerRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const cartScrollRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    didDrag: false,
    blockClick: false,
    cleanup: null,
  });

  const cartDragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    cleanup: null,
  });

  /** 카테고리별 상품 캐시 (전환 시 깜빡임 방지) */
  const productsByCategoryRef = useRef({});
  const categoryRef = useRef(category);
  categoryRef.current = category;

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [catRes, menuRes] = await Promise.all([
        getAppCategories().catch(() => ({ ok: false })),
        getAppMenus().catch(() => ({ ok: false })),
      ]);
      if (cancelled) return;
      const cats = catRes?.ok ? catRes.data || [] : [];
      setCategories([ALL_TAB, ...cats]);
      const allMenus = menuRes?.ok ? menuRes.data || [] : [];
      setProducts(allMenus);
      productsByCategoryRef.current['all'] = allMenus;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchCart = async () => {
    const res = await getAppActiveCart().catch(() => ({ ok: false }));
    if (!res?.ok) return;
    const summary = res.data?.summary || { count: 0, total: 0 };
    setCartCount(Number(summary.count) || 0);
    setTotal(Number(summary.total) || 0);
    setCartItems(Array.isArray(res.data?.items) ? res.data.items : []);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  useEffect(() => {
    const cache = productsByCategoryRef.current;
    const cached = cache[category];

    if (cached) {
      setProducts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchingCategory = category;
    let cancelled = false;
    (async () => {
      const params = fetchingCategory === 'all' ? {} : { category_id: Number(fetchingCategory) };
      const res = await getAppMenus(params).catch(() => ({ ok: false }));
      if (cancelled) return;
      const list = res?.ok ? res.data || [] : [];
      cache[fetchingCategory] = list;
      if (categoryRef.current === fetchingCategory) {
        setProducts(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const onClickCategory = (id) => {
    setCategory(String(id));
  };

  const onCategoryPointerDown = (e) => {
    const el = categoryScrollRef.current;
    if (!el) return;

    // 기존 드래그가 꼬인 경우 대비
    dragStateRef.current.cleanup?.();

    dragStateRef.current.active = true;
    dragStateRef.current.pointerId = e.pointerId;
    dragStateRef.current.startX = e.clientX;
    dragStateRef.current.startScrollLeft = el.scrollLeft;
    dragStateRef.current.didDrag = false;
    dragStateRef.current.blockClick = false;

    // 포인터가 밖으로 나가도 드래그가 풀리도록 window에 붙임 (키오스크 터치에서 클릭 막힘 방지)
    const onMove = (ev) => {
      if (!dragStateRef.current.active) return;
      if (dragStateRef.current.pointerId != null && ev.pointerId !== dragStateRef.current.pointerId) return;
      const dx = ev.clientX - dragStateRef.current.startX;
      if (Math.abs(dx) > 10) dragStateRef.current.didDrag = true;
      el.scrollLeft = dragStateRef.current.startScrollLeft - dx;
      // 드래그 중 텍스트 선택/기본 제스처 최소화
      if (ev.cancelable) ev.preventDefault();
    };

    const end = (ev) => {
      if (dragStateRef.current.pointerId != null && ev.pointerId !== dragStateRef.current.pointerId) return;
      dragStateRef.current.active = false;
      dragStateRef.current.pointerId = null;
      // 드래그로 끝난 경우, 바로 이어지는 click 1회만 차단
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

  const onCartPointerDown = (e) => {
    const el = cartScrollRef.current;
    if (!el) return;
    // 수량/삭제 버튼 클릭은 드래그 시작하지 않음
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button')) return;

    cartDragRef.current.cleanup?.();
    cartDragRef.current.active = true;
    cartDragRef.current.pointerId = e.pointerId;
    cartDragRef.current.startX = e.clientX;
    cartDragRef.current.startScrollLeft = el.scrollLeft;

    const onMove = (ev) => {
      if (!cartDragRef.current.active) return;
      if (cartDragRef.current.pointerId != null && ev.pointerId !== cartDragRef.current.pointerId) return;
      const dx = ev.clientX - cartDragRef.current.startX;
      el.scrollLeft = cartDragRef.current.startScrollLeft - dx;
      if (ev.cancelable) ev.preventDefault(); // 터치 스와이프/텍스트 선택 방지
    };

    const end = (ev) => {
      if (cartDragRef.current.pointerId != null && ev.pointerId !== cartDragRef.current.pointerId) return;
      cartDragRef.current.active = false;
      cartDragRef.current.pointerId = null;
      cartDragRef.current.cleanup?.();
      cartDragRef.current.cleanup = null;
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', end, { passive: true });
    window.addEventListener('pointercancel', end, { passive: true });
    cartDragRef.current.cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  };

  // pointermove/up은 window 리스너로 처리 (클릭 막힘 방지)
  const onCategoryPointerMove = () => {};
  const onCategoryPointerUp = () => {};

  useEffect(() => {
    return () => {
      dragStateRef.current.cleanup?.();
      dragStateRef.current.cleanup = null;
      cartDragRef.current.cleanup?.();
      cartDragRef.current.cleanup = null;
    };
  }, []);

  // 상세에서 "장바구니로 이동"으로 넘어온 경우, 하단 장바구니 영역으로 스크롤(가능한 경우)
  useEffect(() => {
    const wants = Boolean(location?.state?.scrollToCart);
    if (!wants) return;
    window.setTimeout(() => {
      footerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }, 0);
  }, [location?.state]);

  // 상세에서 담기 후 돌아온 경우, 장바구니 다시 조회
  useEffect(() => {
    if (location?.state?.cartRefresh) fetchCart();
  }, [location?.state?.cartRefresh]);

  const handleReset = () => {
    (async () => {
      const res = await deleteAppClearCart().catch(() => ({ ok: false }));
      if (res?.ok) fetchCart();
    })();
  };

  const updateItemQty = async (cartItemId, nextQty) => {
    const id = Number(cartItemId) || 0;
    if (!id) return;
    if (cartBusyId) return;
    setCartBusyId(id);
    try {
      const res = await patchAppCartItemQty(id, Math.max(1, Number(nextQty) || 1)).catch(() => ({ ok: false }));
      if (res?.ok) fetchCart();
    } finally {
      setCartBusyId(0);
    }
  };

  const removeItem = async (cartItemId) => {
    const id = Number(cartItemId) || 0;
    if (!id) return;
    if (cartBusyId) return;
    setCartBusyId(id);
    try {
      const res = await deleteAppCartItem(id).catch(() => ({ ok: false }));
      if (res?.ok) fetchCart();
    } finally {
      setCartBusyId(0);
    }
  };

  return (
    <div className="figma360-stage figma360-stage--menu">
      <div className="figma360-scale figma360-scale--menu" style={{ '--figma360-scale': String(scale) }}>
        <div className="menu">
          <header className="menu__header">
            <img className="menu__logo" src={logoSvg} alt="FELN" />
            <div className="menu__icons">
              <span className="menu__iconWrap menu__iconWrap--cart">
                <button type="button" className="menu__icon" aria-label="장바구니" onClick={() => navigate('/menu/cart')}>
                  <img src={iconCartSvg} alt="" className="menu__iconImg" width="20" height="20" aria-hidden />
                </button>
                {cartCount > 0 && (
                  <span className="menu__cartBadge" aria-label={`장바구니 ${cartCount}개`}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <button type="button" className="menu__icon menu__icon--person" aria-label="마이페이지" onClick={() => navigate('/menu/mypage')}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
              </button>
            </div>
          </header>

          <nav
            ref={categoryScrollRef}
            className="menu__categories"
            onPointerDown={onCategoryPointerDown}
            onPointerMove={onCategoryPointerMove}
            onPointerUp={onCategoryPointerUp}
            onPointerCancel={onCategoryPointerUp}
          >
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`menu__category ${category === String(c.id) ? 'menu__category--active' : ''}`}
                onClick={() => {
                  if (dragStateRef.current.blockClick) return;
                  onClickCategory(c.id);
                }}
              >
                {c.name_ko}
              </button>
            ))}
          </nav>

          <div className="menu__productsWrap">
          <div className="menu__products">
            {loading ? (
              <p className="menu__loading">로딩 중...</p>
            ) : (
              products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="menu__product"
                onClick={() => {
                  navigate(`/menu/${p.id}`);
                }}
              >
                <div
                  className="menu__productImage"
                  style={p.image_url ? { backgroundImage: `url(${p.image_url})` } : undefined}
                  aria-label={`${p.name_ko} 이미지`}
                />
                {Number(p.is_best) === 1 && <span className="menu__productBest">Best</span>}
                <p className="menu__productName">{p.name_ko}</p>
                <p className="menu__productPrice">{(Number(p.base_price) || 0).toLocaleString()}원</p>
              </button>
              ))
            )}
          </div>
          </div>

          <footer ref={footerRef} className="menu__footer">
            <div className="menu__footerRow">
              <div className="menu__cartTitleWrap" aria-label="장바구니">
                <span className="menu__cartTitle">장바구니</span>
                <span className="menu__cartTitleCount">{cartCount}</span>
              </div>
              <button type="button" className="menu__reset" onClick={handleReset}>
                <img src={replaySvg} alt="" className="menu__resetIcon" width="14" height="14" aria-hidden />
                초기화
              </button>
            </div>
            <div className="menu__cartList" aria-label="장바구니 목록">
              {cartItems.length > 0 && (
                <div
                  ref={cartScrollRef}
                  className="menu__cartCards"
                  aria-label="담긴 메뉴"
                  onPointerDown={onCartPointerDown}
                  onPointerMove={() => {}}
                  onPointerUp={() => {}}
                  onPointerCancel={() => {}}
                >
                  {cartItems.map((it) => (
                    <div key={it.id} className="menu__cartCard">
                      <div
                        className="menu__cartCardImg"
                        style={it.image_url ? { backgroundImage: `url(${it.image_url})` } : undefined}
                        aria-hidden
                      />

                      <div className="menu__cartCardInfo">
                        <p className="menu__cartCardName">{it.menu_name_ko}</p>
                        <p className="menu__cartCardPrice">{(Number(it.total_price) || 0).toLocaleString('ko-KR')}원</p>
                      </div>

                      <button
                        type="button"
                        className="menu__cartCardClose"
                        aria-label="삭제"
                        disabled={Number(cartBusyId) === Number(it.id)}
                        onClick={() => removeItem(it.id)}
                      >
                        ×
                      </button>

                      <div className="menu__cartCardQty" aria-label="수량">
                        <button
                          type="button"
                          className="menu__cartCardQtyBtn"
                          aria-label="수량 감소"
                          disabled={Number(cartBusyId) === Number(it.id) || Number(it.qty) <= 1}
                          onClick={() => updateItemQty(it.id, (Number(it.qty) || 1) - 1)}
                        >
                          −
                        </button>
                        <span className="menu__cartCardQtyNum">{it.qty}</span>
                        <button
                          type="button"
                          className="menu__cartCardQtyBtn"
                          aria-label="수량 증가"
                          disabled={Number(cartBusyId) === Number(it.id)}
                          onClick={() => updateItemQty(it.id, (Number(it.qty) || 1) + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="menu__footerRow menu__footerRow--total">
              <span className="menu__totalLabel">총 {total.toLocaleString('ko-KR')}원</span>
              <button
                type="button"
                className="menu__orderBtn"
                onClick={() => {
                  if (cartItems.length === 0) setEmptyCartModalOpen(true);
                  else navigate('/menu/checkout');
                }}
              >
                주문하기
              </button>
            </div>
          </footer>
        </div>
      </div>

      {emptyCartModalOpen && (
        <div
          className="menu__emptyModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu__emptyModalTitle"
          onClick={() => setEmptyCartModalOpen(false)}
        >
          <div className="menu__emptyModal" onClick={(e) => e.stopPropagation()}>
            <p id="menu__emptyModalTitle" className="menu__emptyModalMessage">
              결제할 상품을 선택해주세요.
            </p>
            <div className="menu__emptyModalLine" aria-hidden="true" />
            <button
              type="button"
              className="menu__emptyModalBtn"
              onClick={() => setEmptyCartModalOpen(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
