import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppMenuDetail, getAppActiveCart, getImageUrl, postAppCartItem } from '../../api';

import logoSvg from '../../assets/Vector.svg';
import backSvg from '../../assets/arrow_back_ios_new.svg';
import iconCartSvg from '../../assets/icon-cart.svg';
import replaySvg from '../../assets/replay.svg';

function formatWon(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('ko-KR')}원`;
}

function parseFirstInt(text) {
  const m = String(text || '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseShotCount(text) {
  const s = String(text || '');
  const m = s.match(/(\d+)\s*(?:샷|shot)\b/i);
  return m ? Number(m[1]) : null;
}

function formatNutritionValue(value, unit) {
  const v = String(value ?? '').trim();
  const u = String(unit ?? '').trim();
  if (!v) return '';
  if (!u) return v;
  // value에 이미 단위/퍼센트/문자 등이 포함된 경우(예: "35g(11%)", "320kcal", "30ml") 그대로 사용
  if (/[a-zA-Z가-힣%()]/.test(v)) return v;
  // 이미 단위를 포함하면 그대로
  if (v.toLowerCase().includes(u.toLowerCase())) return v;
  return `${v}${u}`;
}

function findTempGroup(optionGroups = []) {
  const byName = optionGroups.find((g) => String(g.name_ko || '').includes('온도'));
  if (byName) return byName;
  const byCode = optionGroups.find((g) => String(g.code || '').toUpperCase().includes('TEMP'));
  if (byCode) return byCode;
  // HOT/ICED 둘 다 들어있는 아이템을 가진 그룹
  return optionGroups.find((g) => {
    const items = g.items || [];
    const names = items.map((it) => String(it.name_ko || '').toUpperCase());
    return names.includes('HOT') && (names.includes('ICED') || names.includes('ICE'));
  });
}

function findBeanGroup(optionGroups = []) {
  return optionGroups.find((g) => String(g.name_ko || '').includes('원두'));
}

function findShotGroup(optionGroups = []) {
  return optionGroups.find((g) => String(g.name_ko || '').includes('샷'));
}

function findMilkGroup(optionGroups = []) {
  const byName = optionGroups.find((g) => String(g.name_ko || '').includes('우유'));
  if (byName) return byName;
  const byCode = optionGroups.find((g) => String(g.code || '').toUpperCase().includes('MILK'));
  return byCode || null;
}

function findSyrupGroup(optionGroups = []) {
  const byName = optionGroups.find((g) => String(g.name_ko || '').includes('시럽'));
  if (byName) return byName;
  const byCode = optionGroups.find((g) => String(g.code || '').toUpperCase().includes('SYRUP'));
  return byCode || null;
}

function findWhipGroup(optionGroups = []) {
  const byName = optionGroups.find((g) => String(g.name_ko || '').includes('휘핑'));
  if (byName) return byName;
  const byCode = optionGroups.find((g) => String(g.code || '').toUpperCase().includes('WHIP'));
  return byCode || null;
}

function findContainerGroup(optionGroups = []) {
  const byName = optionGroups.find((g) => String(g.name_ko || '').includes('용기'));
  if (byName) return byName;
  const byCode = optionGroups.find((g) => String(g.code || '').toUpperCase().includes('CONTAINER'));
  return byCode || null;
}

export default function MobileMenuDetail() {
  const { id } = useParams();
  const menuId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const cartItemFromCart = location.state?.cartItem;

  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(null);
  const [compact, setCompact] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedByGroup, setSelectedByGroup] = useState({}); // { [group_id]: item_id }
  const [activeSheet, setActiveSheet] = useState(null); // 'shot' | 'milk' | 'syrup' | 'whip' | 'added' | null
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [shotCountDraft, setShotCountDraft] = useState(2);
  const [shotExtraCount, setShotExtraCount] = useState(0); // 기본 2샷 대비 추가 샷 개수
  const [milkDraftItemId, setMilkDraftItemId] = useState(null);
  const [whipDraftItemId, setWhipDraftItemId] = useState(null);
  const [syrupCounts, setSyrupCounts] = useState({}); // { [itemId]: number }
  const [syrupCountsDraft, setSyrupCountsDraft] = useState({}); // { [itemId]: number }
  const [syrupTouched, setSyrupTouched] = useState(false);
  const [syrupNoneSelected, setSyrupNoneSelected] = useState(false);
  const [syrupNoneSelectedDraft, setSyrupNoneSelectedDraft] = useState(false);
  const [syrupCountsBeforeNoneDraft, setSyrupCountsBeforeNoneDraft] = useState({}); // '시럽 없이' 토글 전 상태 백업
  const [milkInitialItemId, setMilkInitialItemId] = useState(null);
  const [whipInitialItemId, setWhipInitialItemId] = useState(null);
  const [syrupInitialCounts, setSyrupInitialCounts] = useState({});
  const [syrupInitialNone, setSyrupInitialNone] = useState(false);

  const scrollRef = useRef(null);
  const scrollRafRef = useRef(0);

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
      const res = await getAppMenuDetail(menuId).catch(() => ({ ok: false }));
      if (cancelled) return;
      setMenu(res?.ok ? res.data : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  useEffect(() => {
    // 메뉴가 바뀌면 샷 커스텀은 초기화
    setShotExtraCount(0);
    setShotCountDraft(2);
    setMilkDraftItemId(null);
    setWhipDraftItemId(null);
    setSyrupCounts({});
    setSyrupCountsDraft({});
    setSyrupTouched(false);
    setSyrupNoneSelected(false);
    setSyrupNoneSelectedDraft(false);
    setSyrupCountsBeforeNoneDraft({});
    setActiveSheet(null);
  }, [menuId]);

  const fetchCart = async () => {
    const res = await getAppActiveCart().catch(() => ({ ok: false }));
    if (res?.ok && res.data?.summary) setCartCount(Number(res.data.summary.count) || 0);
  };

  useEffect(() => {
    fetchCart();
  }, []);

  useEffect(() => {
    const onFocus = () => fetchCart();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // 기본 선택값: 각 그룹의 첫 아이템
  useEffect(() => {
    if (!menu?.option_groups) return;
    const next = {};
    for (const g of menu.option_groups) {
      const gid = Number(g.group_id);
      const first = (g.items || [])[0];
      if (gid && first?.id) next[gid] = Number(first.id);
    }
    setSelectedByGroup((prev) => ({ ...next, ...prev }));
  }, [menu?.option_groups]);

  // 장바구니에서 "옵션변경"으로 들어온 경우: 선택했던 옵션·수량 복원
  useEffect(() => {
    if (!menu?.option_groups?.length || !cartItemFromCart) return;
    const cartItem = cartItemFromCart;
    const opts = Array.isArray(cartItem.options) ? cartItem.options : [];
    const optionGroupsFromMenu = menu.option_groups;
    const shotGrp = findShotGroup(optionGroupsFromMenu);
    const syrupGrp = findSyrupGroup(optionGroupsFromMenu);

    setQty(Math.max(1, Number(cartItem.qty) || 1));

    const nextSelectedByGroup = {};
    let shotExtra = 0;
    let syrupCountsNext = {};
    let syrupNone = false;

    for (const o of opts) {
      const gid = Number(o.group_id);
      const itemId = Number(o.item_id);
      const q = Math.max(0, Number(o.option_qty) || 1);
      const itemNameKo = String(o.item_name_ko || '');

      if (shotGrp && gid === Number(shotGrp.group_id)) {
        const items = shotGrp.items || [];
        const extraItem =
          items.find((it) => String(it.name_ko || '').includes('추가')) ||
          items.find((it) => String(it.name_en || '').toLowerCase().includes('extra')) ||
          null;
        if (extraItem && Number(extraItem.id) === itemId) shotExtra = q;
        continue;
      }
      if (syrupGrp && gid === Number(syrupGrp.group_id)) {
        const items = syrupGrp.items || [];
        const noneItem = items.find((it) => String(it.name_ko || '').includes('없'));
        if (noneItem && Number(noneItem.id) === itemId) {
          syrupNone = true;
          syrupCountsNext = {};
        } else if (!syrupNone) {
          syrupCountsNext[itemId] = (syrupCountsNext[itemId] || 0) + q;
        }
        continue;
      }
      nextSelectedByGroup[gid] = itemId;
    }

    setSelectedByGroup((prev) => ({ ...prev, ...nextSelectedByGroup }));
    setShotExtraCount(shotExtra);
    if (shotExtra > 0) setShotCountDraft(2 + shotExtra);
    setSyrupCounts(syrupCountsNext);
    setSyrupCountsDraft(syrupCountsNext);
    setSyrupTouched(opts.some((o) => syrupGrp && Number(o.group_id) === Number(syrupGrp.group_id)));
    setSyrupNoneSelected(syrupNone);
    setSyrupNoneSelectedDraft(syrupNone);
    setMilkDraftItemId(null);
    setWhipDraftItemId(null);
  }, [menu?.option_groups, cartItemFromCart]);

  // 히어로가 스크롤에서 사라지면 compact 헤더로 전환 (Figma 02/04)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 요청사항: "66만큼 내렸을 때" Figma 834-39850(상단 고정바+작은 상품 헤더) 상태로 전환
    const ENTER_COMPACT_AT = 66;
    const EXIT_COMPACT_AT = 20; // 위로 충분히 올리면 원상복귀
    const onScroll = () => {
      if (scrollRafRef.current) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        const y = el.scrollTop;
        setCompact((prev) => {
          // 진입/해제 임계값을 분리해서 깜빡임(토글 왕복)을 방지
          if (!prev && y >= ENTER_COMPACT_AT) return true;
          if (prev && y <= EXIT_COMPACT_AT) return false;
          return prev;
        });
      });
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollRafRef.current) window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = 0;
    };
  }, []);

  const heroUrl = useMemo(() => {
    const imgs = menu?.images || [];
    const raw = imgs.length ? imgs[0].image_url : menu?.image_url;
    return getImageUrl(raw || '');
  }, [menu]);

  const optionGroups = menu?.option_groups || [];
  const nutritions = menu?.nutritions || [];
  const tempGroup = useMemo(() => findTempGroup(optionGroups), [optionGroups]);
  const containerGroup = useMemo(() => findContainerGroup(optionGroups), [optionGroups]);
  const beanGroup = useMemo(() => findBeanGroup(optionGroups), [optionGroups]);
  const shotGroup = useMemo(() => findShotGroup(optionGroups), [optionGroups]);
  const milkGroup = useMemo(() => findMilkGroup(optionGroups), [optionGroups]);
  const syrupGroup = useMemo(() => findSyrupGroup(optionGroups), [optionGroups]);
  const whipGroup = useMemo(() => findWhipGroup(optionGroups), [optionGroups]);
  const otherGroups = useMemo(
    () => optionGroups.filter((g) => g !== tempGroup && g !== containerGroup && g !== beanGroup),
    [optionGroups, tempGroup, containerGroup, beanGroup]
  );

  const servingNutrition = useMemo(() => {
    return nutritions.find((n) => String(n.code || '').toUpperCase() === 'SERVING') || null;
  }, [nutritions]);

  const nutritionRows = useMemo(() => {
    return nutritions
      .filter((n) => String(n.code || '').toUpperCase() !== 'SERVING')
      .map((n) => ({
        key: `${n.category_id}-${n.code}`,
        name: n.name_ko,
        value: formatNutritionValue(n.value, n.unit),
      }));
  }, [nutritions]);

  const hasNutritionSection = Boolean(servingNutrition?.value) || nutritionRows.length > 0;

  const selectedItems = useMemo(() => {
    const map = {};
    for (const g of optionGroups) {
      const gid = Number(g.group_id);
      const sel = selectedByGroup[gid];
      const item = (g.items || []).find((it) => Number(it.id) === Number(sel));
      if (item) map[gid] = item;
    }
    return map;
  }, [optionGroups, selectedByGroup]);

  const shotMeta = useMemo(() => {
    if (!shotGroup) return { base: 2, extraItem: null, extraPrice: 0 };
    const items = shotGroup.items || [];
    const extraItem =
      items.find((it) => String(it.name_ko || '').includes('추가')) ||
      items.find((it) => String(it.name_en || '').toLowerCase().includes('extra')) ||
      items[1] ||
      null;
    const extraPrice = Number(extraItem?.extra_price) || 0;
    return { base: 2, extraItem, extraPrice };
  }, [shotGroup]);

  const selectedShotCount = useMemo(() => {
    return shotMeta.base + Math.max(0, Number(shotExtraCount) || 0);
  }, [shotMeta.base, shotExtraCount]);

  const beanDescription = useMemo(() => {
    const selectedBean = beanGroup ? selectedItems[Number(beanGroup.group_id)] : null;
    const ko = String(selectedBean?.name_ko || '');
    const en = String(selectedBean?.name_en || '');
    const label = `${ko} ${en}`.toLowerCase();

    const DEFAULT = {
      body: [
        '고소하고 부드러운 산미에 균형 잡힌 바디감이 특징이에요.',
        '진한 커피의 느낌을 원하시거나,',
        '라떼에 어울리는 원두를 찾는 분께 추천드려요.',
      ],
      traits: '고소함 · 미디엄 바디 · 은은한 산미 · 부드러운 끝맛',
    };
    const BLONDE = {
      body: [
        '밝고 산뜻한 산미와 가벼운 바디감이 특징이에요.',
        '커피의 쓴맛보다 깔끔한 풍미를 선호하시거나,',
        '아메리카노를 가볍게 즐기고 싶은 분께 추천드려요.',
      ],
      traits: '산뜻한 산미 · 라이트 바디 · 부드러운 단맛 · 깔끔한 여운',
    };
    const DECAF = {
      body: [
        '카페인 부담은 줄이고 커피 본연의 풍미는 살린 원두예요.',
        '늦은 시간이나 카페인에 민감한 분도 편안하게 즐길 수 있어요.',
      ],
      traits: '부드러운 풍미 · 낮은 카페인 · 균형 잡힌 맛',
    };

    if (ko.includes('블론드') || label.includes('blonde')) return BLONDE;
    if (ko.includes('디카페') || label.includes('decaf')) return DECAF;
    return DEFAULT;
  }, [beanGroup, selectedItems]);

  const optionExtra = useMemo(() => {
    const shotGid = shotGroup ? Number(shotGroup.group_id) : 0;
    const shotExtraItemId = Number(shotMeta.extraItem?.id) || 0;
    const extraCount = Math.max(0, Number(shotExtraCount) || 0);

    return Object.entries(selectedItems).reduce((sum, [gidStr, it]) => {
      const gid = Number(gidStr);
      if (shotGid && gid === shotGid) {
        // 샷은 DB가 "기본/추가샷" 2개만 있어서, 추가샷 선택 시 extra_price를 추가 개수만큼 곱해 반영
        if (shotExtraItemId && Number(it?.id) === shotExtraItemId) {
          return sum + (Number(shotMeta.extraPrice) || 0) * extraCount;
        }
        return sum;
      }
      return sum + (Number(it?.extra_price) || 0);
    }, 0);
  }, [selectedItems, shotGroup, shotMeta.extraItem, shotMeta.extraPrice, shotExtraCount]);

  const syrupExtra = useMemo(() => {
    if (!syrupGroup) return 0;
    const items = syrupGroup.items || [];
    return items.reduce((sum, it) => {
      const n = Math.max(0, Number(syrupCounts[Number(it.id)]) || 0);
      return sum + (Number(it.extra_price) || 0) * n;
    }, 0);
  }, [syrupGroup, syrupCounts]);

  const syrupSummaryText = useMemo(() => {
    if (!syrupGroup) return '';
    const items = syrupGroup.items || [];
    const entries = Object.entries(syrupCounts)
      .map(([id, n]) => ({ id: Number(id), n: Math.max(0, Number(n) || 0) }))
      .filter((x) => x.n > 0);
    if (syrupNoneSelected) return '시럽 없이';
    if (entries.length === 0) return '';
    const nameById = new Map(items.map((it) => [Number(it.id), String(it.name_ko || '')]));
    return entries.map((x) => `${nameById.get(x.id) || '시럽'} ${x.n}`).join(', ');
  }, [syrupGroup, syrupCounts, syrupNoneSelected]);

  const formatPlusWon = (n) => {
    const v = Number(n) || 0;
    if (v <= 0) return '';
    return `+${v.toLocaleString('ko-KR')}원`;
  };

  const unitPrice = (Number(menu?.base_price) || 0) + optionExtra + syrupExtra;
  const totalPrice = unitPrice * (Number(qty) || 1);

  const buildCartOptionsPayload = () => {
    const opts = [];

    for (const g of optionGroups) {
      const gid = Number(g.group_id);
      if (!gid) continue;

      // 샷: 기본샷 + 추가샷을 option_qty로 저장
      if (shotGroup && gid === Number(shotGroup.group_id)) {
        const items = shotGroup.items || [];
        const baseItem =
          items.find((it) => String(it.name_ko || '').includes('기본')) ||
          items.find((it) => String(it.name_en || '').toLowerCase().includes('base')) ||
          items[0];
        if (baseItem?.id) {
          opts.push({ group_id: gid, item_id: Number(baseItem.id), option_qty: Math.max(1, Number(shotMeta.base) || 1) });
        }
        const extra = Math.max(0, Number(shotExtraCount) || 0);
        if (extra > 0 && shotMeta?.extraItem?.id) {
          opts.push({ group_id: gid, item_id: Number(shotMeta.extraItem.id), option_qty: extra });
        }
        continue;
      }

      // 시럽: 선택된 시럽들은 각각 option_qty로 저장, 없으면 '시럽 없음' 아이템 1줄 저장
      if (syrupGroup && gid === Number(syrupGroup.group_id)) {
        const items = syrupGroup.items || [];
        const noneItem =
          items.find((it) => String(it.name_ko || '').includes('없')) ||
          items.find((it) => String(it.name_en || '').toLowerCase().includes('none')) ||
          null;
        const entries = Object.entries(syrupCounts)
          .map(([idStr, n]) => ({ id: Number(idStr), n: Math.max(0, Number(n) || 0) }))
          .filter((x) => x.id && x.n > 0);

        if (entries.length > 0) {
          for (const e of entries) {
            opts.push({ group_id: gid, item_id: e.id, option_qty: e.n });
          }
        } else if (noneItem?.id) {
          opts.push({ group_id: gid, item_id: Number(noneItem.id), option_qty: 1 });
        }
        continue;
      }

      // 나머지 SINGLE 옵션: 선택값(없으면 첫 아이템) 저장
      const selectedId = Number(selectedByGroup[gid]) || Number((g.items || [])[0]?.id) || 0;
      if (selectedId) opts.push({ group_id: gid, item_id: selectedId, option_qty: 1 });
    }

    return opts;
  };

  const handleAddToCart = async () => {
    if (addingToCart) return;
    if (!menuId) return;

    setAddingToCart(true);
    try {
      const options = buildCartOptionsPayload();
      const res = await postAppCartItem({
        menu_id: menuId,
        qty: Math.max(1, Number(qty) || 1),
        options,
      }).catch((e) => ({ ok: false, message: e?.message || '장바구니 담기 실패' }));

      if (!res?.ok) {
        window.alert(res?.message || '장바구니 담기 실패');
        return;
      }

      fetchCart();
      setActiveSheet('added');
    } finally {
      setAddingToCart(false);
    }
  };

  const currentTempText = useMemo(() => {
    if (!tempGroup) return '';
    const sel = selectedItems[Number(tempGroup.group_id)];
    return sel ? String(sel.name_ko || '') : '';
  }, [tempGroup, selectedItems]);

  const currentBeanText = useMemo(() => {
    if (!beanGroup) return '';
    const sel = selectedItems[Number(beanGroup.group_id)];
    return sel ? String(sel.name_ko || '') : '';
  }, [beanGroup, selectedItems]);

  const defaultItemIdByGroup = useMemo(() => {
    const map = {};
    for (const g of optionGroups) {
      const gid = Number(g.group_id);
      const first = (g.items || [])[0];
      if (gid && first?.id) map[gid] = Number(first.id);
    }
    return map;
  }, [optionGroups]);

  const changedOptionRows = useMemo(() => {
    const rows = [];

    // 온도는 기본값이든 아니든 항상 보여주기 (기존 디자인/표시 방식 유지)
    if (tempGroup) {
      rows.push({
        key: 'temp',
        name: '온도',
        value: currentTempText,
        priceText: '',
      });
    }

    for (const g of optionGroups) {
      const gid = Number(g.group_id);
      if (!gid) continue;
      if (tempGroup && gid === Number(tempGroup.group_id)) continue;

      // 샷은 DB 구조상(기본/추가샷) + "추가 개수"로 변경 여부를 판단
      if (shotGroup && gid === Number(shotGroup.group_id)) {
        if ((Number(shotExtraCount) || 0) <= 0) continue;
        const shotExtraPrice = (Number(shotMeta?.extraPrice) || 0) * Math.max(0, Number(shotExtraCount) || 0);
        rows.push({
          key: String(gid),
          name: String(g.name_ko || ''),
          value: selectedShotCount === shotMeta.base ? `에스프레소 기본 ${selectedShotCount}샷` : `에스프레소 ${selectedShotCount}샷`,
          priceText: formatPlusWon(shotExtraPrice),
        });
        continue;
      }

      // 시럽은 시럽별 수량이 1개라도 있으면 변경된 옵션에 표시
      if (syrupGroup && gid === Number(syrupGroup.group_id)) {
        // "시럽 없이"도 선택으로 보여야 함 → 한 번이라도 시럽 시트를 적용했으면 표시
        if (!syrupTouched) continue;
        const value = syrupSummaryText || '시럽 없이';
        rows.push({
          key: String(gid),
          name: String(g.name_ko || ''),
          value,
          priceText: formatPlusWon(syrupExtra),
        });
        continue;
      }

      const defaultId = Number(defaultItemIdByGroup[gid]);
      const selectedId = Number(selectedByGroup[gid]);
      if (!defaultId || !selectedId) continue;

      // 기본값이면 변경된 옵션에 표시하지 않음
      if (selectedId === defaultId) continue;

      // 원두는 기본 원두(기본값)일 때는 절대 표시하지 않고, 변경된 경우(블론드/디카페인 등)만 표시
      if (beanGroup && gid === Number(beanGroup.group_id)) {
        // 여기까지 왔으면 이미 기본값이 아니므로 표시
      }

      const item = selectedItems[gid];
      rows.push({
        key: String(gid),
        name: String(g.name_ko || ''),
        value: item ? String(item.name_ko || '') : '',
        priceText: formatPlusWon(item?.extra_price),
      });
    }

    return rows;
  }, [
    optionGroups,
    tempGroup,
    beanGroup,
    shotGroup,
    selectedShotCount,
    shotExtraCount,
    shotMeta?.extraPrice,
    syrupGroup,
    syrupExtra,
    syrupTouched,
    syrupSummaryText,
    currentTempText,
    defaultItemIdByGroup,
    selectedByGroup,
    selectedItems,
  ]);

  const setGroupSelection = (groupId, itemId) => {
    setSelectedByGroup((prev) => ({ ...prev, [Number(groupId)]: Number(itemId) }));
  };

  const openShotSheet = () => {
    setShotCountDraft(selectedShotCount);
    setActiveSheet('shot');
  };

  const openMilkSheet = () => {
    if (!milkGroup) return;
    const gid = Number(milkGroup.group_id);
    const selectedId = Number(selectedByGroup[gid]);
    const first = (milkGroup.items || [])[0];
    const initial = selectedId || Number(first?.id) || null;
    setMilkDraftItemId(initial);
    setMilkInitialItemId(initial);
    setActiveSheet('milk');
  };

  const openWhipSheet = () => {
    if (!whipGroup) return;
    const gid = Number(whipGroup.group_id);
    const selectedId = Number(selectedByGroup[gid]);
    const first = (whipGroup.items || [])[0];
    const initial = selectedId || Number(first?.id) || null;
    setWhipDraftItemId(initial);
    setWhipInitialItemId(initial);
    setActiveSheet('whip');
  };

  const openSyrupSheet = () => {
    setSyrupCountsDraft({ ...syrupCounts });
    setSyrupNoneSelectedDraft(syrupNoneSelected);
    setSyrupCountsBeforeNoneDraft({ ...syrupCounts });
    setSyrupInitialCounts({ ...syrupCounts });
    setSyrupInitialNone(syrupNoneSelected);
    setActiveSheet('syrup');
  };

  const applyShotSheet = () => {
    if (shotGroup) {
      const gid = Number(shotGroup.group_id);
      const extra = Math.max(0, Number(shotCountDraft) - shotMeta.base);
      setShotExtraCount(extra);
      if (extra <= 0) {
        const first = (shotGroup.items || [])[0];
        if (first?.id) setGroupSelection(gid, first.id);
      } else {
        const extraItemId = Number(shotMeta.extraItem?.id) || 0;
        if (extraItemId) setGroupSelection(gid, extraItemId);
      }
    }
    setActiveSheet(null);
  };

  const applyMilkSheet = () => {
    if (!milkGroup) return setActiveSheet(null);
    const gid = Number(milkGroup.group_id);
    if (milkDraftItemId) setGroupSelection(gid, milkDraftItemId);
    setActiveSheet(null);
  };

  const applyWhipSheet = () => {
    if (!whipGroup) return setActiveSheet(null);
    const gid = Number(whipGroup.group_id);
    if (whipDraftItemId) setGroupSelection(gid, whipDraftItemId);
    setActiveSheet(null);
  };

  const applySyrupSheet = () => {
    setSyrupCounts(syrupCountsDraft);
    setSyrupNoneSelected(Boolean(syrupNoneSelectedDraft));
    setSyrupTouched(true);
    setActiveSheet(null);
  };

  return (
    <div className="figma360-stage">
      <div className="figma360-scale figma360-scale--menuDetail" style={{ '--figma360-scale': String(scale) }}>
        <div className="menu-detail">
          {/* 상단 헤더: 01(사진 위 아이콘만) / 02(고정바) - 레이아웃 공간 없이 오버레이 */}
          <div className={`menu-detail__topOverlay ${compact ? 'menu-detail__topOverlay--hidden' : ''}`} aria-label="상단 아이콘">
            <button type="button" className="menu-detail__iconBtn" aria-label="뒤로" onClick={() => navigate(-1)}>
              <img src={backSvg} alt="" width={18} height={18} />
            </button>
            <span className="menu-detail__cartWrap">
              <button type="button" className="menu-detail__iconBtn" aria-label={`장바구니 ${cartCount}개`} onClick={() => navigate('/menu/cart')}>
                <img src={iconCartSvg} alt="" width={20} height={20} aria-hidden />
              </button>
              {cartCount > 0 && (
                <span className="menu-detail__cartBadge" aria-hidden>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
          </div>
          <header className={`menu-detail__topBar ${compact ? '' : 'menu-detail__topBar--hidden'}`} aria-label="상단 고정바">
            <button type="button" className="menu-detail__iconBtn" aria-label="뒤로" onClick={() => navigate(-1)}>
              <img src={backSvg} alt="" width={18} height={18} />
            </button>
            <img className="menu-detail__logo" src={logoSvg} alt="FELN" />
            <span className="menu-detail__cartWrap">
              <button type="button" className="menu-detail__iconBtn" aria-label={`장바구니 ${cartCount}개`} onClick={() => navigate('/menu/cart')}>
                <img src={iconCartSvg} alt="" width={20} height={20} aria-hidden />
              </button>
              {cartCount > 0 && (
                <span className="menu-detail__cartBadge" aria-hidden>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
          </header>

          {/* 스크롤 영역 */}
          <div ref={scrollRef} className={`menu-detail__scroll ${compact ? 'menu-detail__scroll--compact' : ''}`}>
            {compact && (
              <>
                {/* scrollTop이 ENTER(66)일 때 compact 헤더가 화면 상단에 딱 맞게 오도록 스페이서 */}
                <div className="menu-detail__compactSpacer" aria-hidden />
                <div className="menu-detail__compactHeader" aria-label="compact 상품 헤더">
                  <div className="menu-detail__compactRow">
                    <div className="menu-detail__compactImg" style={heroUrl ? { backgroundImage: `url(${heroUrl})` } : undefined} />
                    <div className="menu-detail__compactInfo">
                      <div className="menu-detail__nameRow">
                        <p className="menu-detail__nameCompact">{menu?.name_ko || ''}</p>
                        {Number(menu?.is_best) === 1 && <span className="menu-detail__bestBadge">Best</span>}
                      </div>
                      <p className="menu-detail__nameEn">{menu?.name_en || ''}</p>
                    </div>
                    <p className="menu-detail__priceCompact">{formatWon(menu?.base_price)}</p>
                  </div>
                  <div className="menu-detail__divider" />
                </div>
              </>
            )}
            {!compact && (
              <>
                {/* 히어로 */}
                <div className="menu-detail__hero">
                  <div className="menu-detail__heroFull" aria-label="메뉴 메인 이미지">
                    {heroUrl ? (
                      <img className="menu-detail__heroFullImg" src={heroUrl} alt="" />
                    ) : (
                      <div className="menu-detail__heroFullImg menu-detail__heroFullImg--empty" aria-hidden />
                    )}
                  </div>
                </div>

                {/* 구분선 */}
                <div className="menu-detail__divider" />

                {/* 기본 정보(01) */}
                <section className="menu-detail__info">
                  <div className="menu-detail__nameBlock">
                    <div className="menu-detail__nameRow">
                      <h1 className="menu-detail__name">{menu?.name_ko || ''}</h1>
                      {Number(menu?.is_best) === 1 && <span className="menu-detail__bestBadge">Best</span>}
                    </div>
                    <p className="menu-detail__nameEn">{menu?.name_en || ''}</p>
                  </div>
                  <p className="menu-detail__desc">{menu?.description || ''}</p>
                  <p className="menu-detail__price">{formatWon(menu?.base_price)}</p>
                </section>
              </>
            )}

            {/* HOT/ICED (온도 옵션) */}
            {tempGroup && (
              <div className={`menu-detail__tempPill ${compact ? 'menu-detail__tempPill--compact' : ''}`}>
                {(() => {
                  const gid = Number(tempGroup.group_id);
                  const sel = Number(selectedByGroup[gid]);
                  const items = (tempGroup.items || []).slice(0, 2);
                  return (
                    <>
                      {items.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          className={`menu-detail__tempBtn ${String(it.name_ko || '').toUpperCase().includes('ICED') ? 'menu-detail__tempBtn--iced' : 'menu-detail__tempBtn--hot'} ${Number(it.id) === sel ? 'menu-detail__tempBtn--active' : ''}`}
                          onClick={() => setGroupSelection(gid, it.id)}
                        >
                          {String(it.name_ko || '')}
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}

            {/* 용기 옵션 (Figma 834-43756) - CUP/CORN 등 */}
            {containerGroup && (
              <div className={`menu-detail__containerPill ${compact ? 'menu-detail__containerPill--compact' : ''}`}>
                {(containerGroup.items || []).map((it) => {
                  const gid = Number(containerGroup.group_id);
                  const sel = Number(selectedByGroup[gid]);
                  const active = Number(it.id) === sel;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`menu-detail__containerBtn ${active ? 'menu-detail__containerBtn--active' : ''}`}
                      onClick={() => setGroupSelection(gid, it.id)}
                    >
                      {String(it.name_en || it.name_ko || '').toUpperCase()}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 옵션 영역(원두/기타) - 아래로 스크롤하면 자연스럽게 보이게 항상 렌더 */}
            {menu && (
              <section className={`menu-detail__options ${compact ? 'menu-detail__options--compact' : ''}`}>
                {/* 원두 - 옵션에 원두 그룹이 있을 때만 표시 */}
                {beanGroup && (
                  <>
                    <div className="menu-detail__sectionTitle">원두</div>
                    <div className="menu-detail__beanRow">
                      {(beanGroup.items || []).slice(0, 3).map((it) => {
                        const gid = Number(beanGroup.group_id);
                        const sel = Number(selectedByGroup[gid]);
                        const active = Number(it.id) === sel;
                        return (
                          <button
                            key={it.id}
                            type="button"
                            className={`menu-detail__beanCard ${active ? 'menu-detail__beanCard--active' : ''}`}
                            onClick={() => setGroupSelection(gid, it.id)}
                          >
                            <p className="menu-detail__beanKo">{it.name_ko}</p>
                            <p className="menu-detail__beanEn">{it.name_en || ''}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="menu-detail__beanDesc">
                      <div className="menu-detail__beanDescText">
                        <p className="menu-detail__beanDescBody">
                          {beanDescription.body.map((line, idx) => (
                            <span key={idx}>
                              {line}
                              <br />
                            </span>
                          ))}
                        </p>
                        <p className="menu-detail__beanDescTraits">{beanDescription.traits}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* 기타 옵션 목록 (샷/우유/시럽 등) */}
                {otherGroups.map((g) => {
                  const gid = Number(g.group_id);
                  const sel = selectedItems[gid];
                  const isShot = String(g.name_ko || '').includes('샷');
                  const isMilk = String(g.name_ko || '').includes('우유');
                  const isSyrup = String(g.name_ko || '').includes('시럽');
                  const isWhip = String(g.name_ko || '').includes('휘핑');
                  const isShotGid = shotGroup && gid === Number(shotGroup.group_id);
                  const isMilkGid = milkGroup && gid === Number(milkGroup.group_id);
                  const isSyrupGid = syrupGroup && gid === Number(syrupGroup.group_id);
                  const isWhipGid = whipGroup && gid === Number(whipGroup.group_id);

                  const extraPriceText = (() => {
                    if (isShotGid) return formatPlusWon((shotMeta?.extraPrice || 0) * Math.max(0, Number(shotExtraCount) || 0));
                    if (isMilkGid) return formatPlusWon(sel?.extra_price);
                    if (isSyrupGid) return formatPlusWon(syrupExtra);
                    if (isWhipGid) return formatPlusWon(sel?.extra_price);
                    return formatPlusWon(sel?.extra_price);
                  })();

                  const valueText = (() => {
                    if (isShot) return selectedShotCount === shotMeta.base ? `기본 ${selectedShotCount}샷` : `${selectedShotCount}샷`;
                    if (isSyrup) return syrupTouched ? (syrupSummaryText || (syrupNoneSelected ? '시럽 없이' : '')) : '';
                    return sel ? sel.name_ko : '';
                  })();

                  return (
                    <button
                      key={gid}
                      type="button"
                      className="menu-detail__optRow"
                      aria-label={`${g.name_ko} 선택`}
                      onClick={() => {
                        if (isShot) openShotSheet();
                        if (isMilk) openMilkSheet();
                        if (isSyrup) openSyrupSheet();
                        if (isWhip) openWhipSheet();
                      }}
                    >
                      <div className="menu-detail__optLeft">
                        <p className="menu-detail__optName">{g.name_ko}</p>
                        <p className="menu-detail__optValue">{valueText}</p>
                      </div>
                      <div className="menu-detail__optRight" aria-hidden>
                        {extraPriceText ? <span className="menu-detail__optExtra">{extraPriceText}</span> : null}
                        <span className="menu-detail__chev">›</span>
                      </div>
                    </button>
                  );
                })}
              </section>
            )}

            {/* 영양정보 - 맨 아래(옵션들 아래)에 위치 */}
            {hasNutritionSection && (
              <section className="menu-detail__nutrition" aria-label="영양정보">
                <div className="menu-detail__nutritionHead">
                  <p className="menu-detail__nutritionTitle">영양정보</p>
                  {servingNutrition?.value ? (
                    <p className="menu-detail__nutritionServing">
                      1회 제공량 :{formatNutritionValue(servingNutrition.value, servingNutrition.unit)}
                    </p>
                  ) : null}
                  <p className="menu-detail__nutritionNote">괄호의 (%)는 1일 영양성분 기준치에 대한 비율입니다.</p>
                </div>
                {nutritionRows.length > 0 && (
                  <div className="menu-detail__nutritionBox">
                    {nutritionRows.map((r, idx) => (
                      <div key={r.key} className="menu-detail__nutritionRow">
                        <p className="menu-detail__nutritionName">{r.name}</p>
                        <p className="menu-detail__nutritionValue">{r.value}</p>
                        {/* 마지막 행 아래에도 구분선 표시 (Figma처럼 "끝"에도 회색 줄) */}
                        <div className="menu-detail__nutritionLine" aria-hidden />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 여백: 하단 고정 패널 가림 방지 */}
            <div className="menu-detail__bottomSpace" />

            {loading && <p className="menu-detail__loading">로딩 중...</p>}
            {!loading && !menu && <p className="menu-detail__loading">메뉴를 찾을 수 없습니다.</p>}
          </div>

          {/* 하단 고정 패널 (변경된 옵션/수량/가격/담기) */}
          <footer className="menu-detail__bottom">
            <p className="menu-detail__changedLabel">변경된 옵션</p>
            {changedOptionRows.map((r) => (
              <div key={r.key} className="menu-detail__changedRow">
                <span className="menu-detail__changedName">{r.name}</span>
                <span className="menu-detail__changedValue">{r.value}</span>
                {r.priceText ? <span className="menu-detail__changedPrice">{r.priceText}</span> : null}
              </div>
            ))}
            <div className="menu-detail__bottomLine" />

            <div className="menu-detail__qtyRow">
              <div className="menu-detail__qty">
                <button type="button" className="menu-detail__qtyBtn" onClick={() => setQty((n) => Math.max(1, (Number(n) || 1) - 1))} aria-label="수량 감소">
                  −
                </button>
                <span className="menu-detail__qtyNum">{qty}</span>
                <button type="button" className="menu-detail__qtyBtn menu-detail__qtyBtn--plus" onClick={() => setQty((n) => (Number(n) || 1) + 1)} aria-label="수량 증가">
                  +
                </button>
              </div>
              <p className="menu-detail__total">{formatWon(totalPrice)}</p>
            </div>

            <button
              type="button"
              className="menu-detail__addBtn"
              aria-disabled={addingToCart ? 'true' : 'false'}
              onClick={handleAddToCart}
            >
              {addingToCart ? '담는 중...' : '메뉴 담기'}
            </button>
          </footer>

          {/* 장바구니 담기 완료 모달 (Figma 834-42254) */}
          {activeSheet === 'added' && (
            <div
              className="menu-detail__sheetOverlay"
              role="dialog"
              aria-modal="true"
              aria-label="장바구니 추가 완료"
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveSheet(null);
              }}
            >
              <div className="menu-detail__sheet menu-detail__sheet--added">
                <button type="button" className="menu-detail__sheetClose" aria-label="닫기" onClick={() => setActiveSheet(null)}>
                  ×
                </button>
                <p className="menu-detail__sheetTitle">장바구니에 추가되었어요</p>

                <div className="menu-detail__addedActions">
                  <button
                    type="button"
                    className="menu-detail__addedBtn menu-detail__addedBtn--outline"
                    onClick={() => {
                      setActiveSheet(null);
                      navigate('/menu/cart');
                    }}
                  >
                    장바구니로 이동
                  </button>
                  <button
                    type="button"
                    className="menu-detail__addedBtn menu-detail__addedBtn--primary"
                    onClick={() => {
                      setActiveSheet(null);
                      navigate('/menu', { state: { cartRefresh: Date.now() } });
                    }}
                  >
                    다른 메뉴 더 보기
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 샷 바텀시트 (Figma 834-40184) */}
          {activeSheet === 'shot' && (
            <div
              className="menu-detail__sheetOverlay"
              role="dialog"
              aria-modal="true"
              aria-label="샷 옵션"
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveSheet(null);
              }}
            >
              <div className="menu-detail__sheet menu-detail__sheet--shot">
                <div className="menu-detail__sheetHeaderRight">
                  {shotCountDraft > shotMeta.base && (
                    <button type="button" className="menu-detail__sheetReset" onClick={() => setShotCountDraft(shotMeta.base)} aria-label="샷 초기화">
                      <img src={replaySvg} alt="" className="menu-detail__sheetResetIcon" width="14" height="14" aria-hidden />
                      초기화
                    </button>
                  )}
                  <button type="button" className="menu-detail__sheetClose" aria-label="닫기" onClick={() => setActiveSheet(null)}>
                    ×
                  </button>
                </div>
                <p className="menu-detail__sheetTitle">샷</p>
                <p className="menu-detail__sheetSubtitle">에스프레소를 커스텀으로 즐겨보세요!</p>

                <div className="menu-detail__sheetRow">
                  <p className="menu-detail__sheetItem">에스프레소 샷</p>
                  {shotCountDraft > shotMeta.base && (
                    <span className="menu-detail__sheetExtraPrice">
                      +{((shotCountDraft - shotMeta.base) * (shotMeta.extraPrice || 0)).toLocaleString('ko-KR')}원
                    </span>
                  )}
                  <div className="menu-detail__sheetQty">
                    <button
                      type="button"
                      className="menu-detail__qtyBtn"
                      aria-label="샷 감소"
                      onClick={() => setShotCountDraft((n) => Math.max(shotMeta.base, (Number(n) || shotMeta.base) - 1))}
                    >
                      −
                    </button>
                    <span className="menu-detail__sheetQtyNum">{shotCountDraft}</span>
                    <button
                      type="button"
                      className="menu-detail__qtyBtn menu-detail__qtyBtn--plus"
                      aria-label="샷 증가"
                      onClick={() => setShotCountDraft((n) => (Number(n) || 0) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <button type="button" className="menu-detail__sheetApplyBtn" onClick={applyShotSheet}>
                  적용하기
                </button>
              </div>
            </div>
          )}

          {/* 우유 바텀시트 (Figma 834-40663) */}
          {activeSheet === 'milk' && milkGroup && (
            <div
              className="menu-detail__sheetOverlay"
              role="dialog"
              aria-modal="true"
              aria-label="우유 옵션"
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveSheet(null);
              }}
            >
              <div className="menu-detail__sheet menu-detail__sheet--milk">
                <div className="menu-detail__sheetHeaderRight">
                  {milkDraftItemId !== milkInitialItemId && (
                    <button type="button" className="menu-detail__sheetReset" onClick={() => setMilkDraftItemId(milkInitialItemId)} aria-label="우유 초기화">
                      <img src={replaySvg} alt="" className="menu-detail__sheetResetIcon" width="14" height="14" aria-hidden />
                      초기화
                    </button>
                  )}
                  <button type="button" className="menu-detail__sheetClose" aria-label="닫기" onClick={() => setActiveSheet(null)}>
                    ×
                  </button>
                </div>
                <p className="menu-detail__sheetTitle">우유</p>

                <div className="menu-detail__milkGrid" aria-label="우유 선택">
                  {(milkGroup.items || []).slice(0, 4).map((it) => {
                    const active = Number(it.id) === Number(milkDraftItemId);
                    const extra = Number(it.extra_price) || 0;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        className={`menu-detail__milkCard ${active ? 'menu-detail__milkCard--active' : ''}`}
                        onClick={() => setMilkDraftItemId(Number(it.id))}
                      >
                        <p className="menu-detail__milkKo">{it.name_ko}</p>
                        <p className="menu-detail__milkEn">{it.name_en || ''}</p>
                        {extra > 0 && <p className="menu-detail__milkPrice">+{extra.toLocaleString('ko-KR')}원</p>}
                      </button>
                    );
                  })}
                </div>

                <button type="button" className="menu-detail__sheetApplyBtn" onClick={applyMilkSheet}>
                  적용하기
                </button>
              </div>
            </div>
          )}

          {/* 휘핑 크림 바텀시트 (Figma 834-43084) */}
          {activeSheet === 'whip' && whipGroup && (
            <div
              className="menu-detail__sheetOverlay"
              role="dialog"
              aria-modal="true"
              aria-label="휘핑 크림 옵션"
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveSheet(null);
              }}
            >
              <div className="menu-detail__sheet menu-detail__sheet--whip">
                <div className="menu-detail__sheetHeaderRight">
                  {whipDraftItemId !== whipInitialItemId && (
                    <button type="button" className="menu-detail__sheetReset" onClick={() => setWhipDraftItemId(whipInitialItemId)} aria-label="휘핑 크림 초기화">
                      <img src={replaySvg} alt="" className="menu-detail__sheetResetIcon" width="14" height="14" aria-hidden />
                      초기화
                    </button>
                  )}
                  <button type="button" className="menu-detail__sheetClose" aria-label="닫기" onClick={() => setActiveSheet(null)}>
                    ×
                  </button>
                </div>
                <p className="menu-detail__sheetTitle">휘핑 크림</p>

                <div className="menu-detail__whipBody" aria-label="휘핑 크림 선택">
                  <div className="menu-detail__whipMeta">
                    <p className="menu-detail__whipMetaLabel">기본 옵션</p>
                    <p className="menu-detail__whipMetaValue">휘핑 크림</p>
                  </div>

                  <div className="menu-detail__whipChoices">
                    {(() => {
                      const items = whipGroup.items || [];
                      const orderIndex = (nameKo) => {
                        const name = String(nameKo || '');
                        // 다양한 표기(없이/없음/없어요/미포함 등)까지 넓게 매칭
                        if (name.includes('없') || name.includes('미포함')) return 0; // 없이
                        if (name.includes('적')) return 1; // 적게
                        if (name.includes('보통') || name.includes('기본')) return 2; // 보통(기본)
                        if (name.includes('많')) return 3; // 많이
                        return 999;
                      };

                      const sorted = [...items].sort((a, b) => orderIndex(a.name_ko) - orderIndex(b.name_ko));

                      return sorted.slice(0, 4).map((it) => {
                        const active = Number(it.id) === Number(whipDraftItemId);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            className={`menu-detail__whipBtn ${active ? 'menu-detail__whipBtn--active' : ''}`}
                            onClick={() => setWhipDraftItemId(Number(it.id))}
                          >
                            {(() => {
                              const name = String(it.name_ko || '');
                              if (name.includes('없') || name.includes('미포함')) return '없이';
                              if (name.includes('적')) return '적게';
                              if (name.includes('보통') || name.includes('기본')) return '보통';
                              if (name.includes('많')) return '많이';
                              return it.name_ko;
                            })()}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                <button type="button" className="menu-detail__sheetApplyBtn" onClick={applyWhipSheet}>
                  적용하기
                </button>
              </div>
            </div>
          )}

          {/* 시럽 바텀시트 (Figma 1168-6593) */}
          {activeSheet === 'syrup' && (
            <div
              className="menu-detail__sheetOverlay"
              role="dialog"
              aria-modal="true"
              aria-label="시럽 옵션"
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveSheet(null);
              }}
            >
              <div className="menu-detail__sheet menu-detail__sheet--syrup">
                <div className="menu-detail__sheetHeaderRight">
                  {(syrupNoneSelectedDraft !== syrupInitialNone ||
                    JSON.stringify(syrupCountsDraft) !== JSON.stringify(syrupInitialCounts)) && (
                    <button
                      type="button"
                      className="menu-detail__sheetReset"
                      onClick={() => {
                        setSyrupCountsDraft({ ...syrupInitialCounts });
                        setSyrupNoneSelectedDraft(syrupInitialNone);
                        setSyrupCountsBeforeNoneDraft({ ...syrupInitialCounts });
                      }}
                      aria-label="시럽 초기화"
                    >
                      <img src={replaySvg} alt="" className="menu-detail__sheetResetIcon" width="14" height="14" aria-hidden />
                      초기화
                    </button>
                  )}
                  <button type="button" className="menu-detail__sheetClose" aria-label="닫기" onClick={() => setActiveSheet(null)}>
                    ×
                  </button>
                </div>
                <p className="menu-detail__sheetTitle">시럽</p>

                <div className="menu-detail__syrupList" aria-label="시럽 선택">
                  <div className="menu-detail__syrupTopRow">
                    <p className="menu-detail__syrupLabel">시럽 없이(선택)</p>
                    <button
                      type="button"
                      className={`menu-detail__syrupNoneChip ${
                        syrupNoneSelectedDraft ? 'menu-detail__syrupNoneChip--active' : ''
                      }`}
                      onClick={() => {
                        setSyrupNoneSelectedDraft((prev) => {
                          const next = !prev;
                          if (next) {
                            // '시럽 없이'를 켜기 전 현재 상태를 백업하고 수량을 초기화
                            setSyrupCountsBeforeNoneDraft({ ...syrupCountsDraft });
                            setSyrupCountsDraft({});
                          } else {
                            // 다시 끄면 백업해둔 수량을 복원 (취소)
                            setSyrupCountsDraft({ ...syrupCountsBeforeNoneDraft });
                          }
                          return next;
                        });
                      }}
                    >
                      시럽 없이
                    </button>
                  </div>

                  {(() => {
                    // "시럽 없이"는 아이템이 없을 수도 있으니 하드코딩 행 + 나머지 아이템을 수량으로 표현
                    const items = (syrupGroup?.items || []).filter((it) => !String(it.name_ko || '').includes('없'));
                    return items.map((it) => {
                      const id = Number(it.id);
                      const n = Math.max(0, Number(syrupCountsDraft[id]) || 0);
                      return (
                        <div key={id} className="menu-detail__syrupRow">
                          <p className="menu-detail__syrupName">{it.name_ko}</p>
                          <div className="menu-detail__syrupQty">
                            <button
                              type="button"
                              className="menu-detail__syrupQtyBtn menu-detail__syrupQtyBtn--minus"
                              aria-label={`${it.name_ko} 감소`}
                              onClick={() => {
                                setSyrupNoneSelectedDraft(false);
                                setSyrupCountsDraft((prev) => ({ ...prev, [id]: Math.max(0, (Number(prev[id]) || 0) - 1) }));
                              }}
                            >
                              −
                            </button>
                            <span className="menu-detail__syrupQtyNum">{n}</span>
                            <button
                              type="button"
                              className="menu-detail__syrupQtyBtn menu-detail__syrupQtyBtn--plus"
                              aria-label={`${it.name_ko} 증가`}
                              onClick={() => {
                                setSyrupNoneSelectedDraft(false);
                                setSyrupCountsDraft((prev) => ({ ...prev, [id]: (Number(prev[id]) || 0) + 1 }));
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                <button type="button" className="menu-detail__sheetApplyBtn" onClick={applySyrupSheet}>
                  적용하기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

