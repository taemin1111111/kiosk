import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppOrders } from '../../api';
import notificationsSvg from '../../assets/notifications.svg';

/* orders.status ENUM: PENDING, PAID, CANCELLED, FAILED */
const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: '주문대기' },
  { value: 'PAID', label: '결제완료' },
  { value: 'CANCELLED', label: '주문취소' },
  { value: 'FAILED', label: '결제실패' },
];

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDisplayDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${y}.${m}.${d}`;
}

export default function MobileOrderHistory() {
  const [scale, setScale] = useState(1);
  const [data, setData] = useState({ member_name: '', orders: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const statusRef = useRef(null);
  const navigate = useNavigate();

  const defaultRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return { from: toYMD(start), to: toYMD(end) };
  }, []);

  const effectiveDateFrom = dateFrom || defaultRange.from;
  const effectiveDateTo = dateTo || defaultRange.to;
  const dateRangeStr = `${toDisplayDate(effectiveDateFrom)} - ${toDisplayDate(effectiveDateTo)}`;
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || '전체';

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
      const params = {
        dateFrom: effectiveDateFrom,
        dateTo: effectiveDateTo,
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await getAppOrders(params).catch(() => ({ ok: false }));
      if (cancelled) return;
      if (res?.ok && res.data) {
        setData({
          member_name: res.data.member_name || '',
          orders: Array.isArray(res.data.orders) ? res.data.orders : [],
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [statusFilter, effectiveDateFrom, effectiveDateTo]);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const onDocClick = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusDropdownOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [statusDropdownOpen]);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}.${m}.${day} ${h}:${min}`;
  };

  const openDateModal = () => {
    setTempDateFrom(effectiveDateFrom);
    setTempDateTo(effectiveDateTo);
    setDateModalOpen(true);
  };

  const applyDateRange = () => {
    setDateFrom(tempDateFrom || effectiveDateFrom);
    setDateTo(tempDateTo || effectiveDateTo);
    setDateModalOpen(false);
  };

  return (
    <div className="figma360-stage figma360-stage--order-history" data-node-id="836-119340">
      <div className="figma360-scale figma360-scale--order-history" style={{ '--figma360-scale': String(scale) }}>
        <div className="order-history">
          <div className="order-history__topBar">
            <button type="button" className="order-history__back" aria-label="뒤로" onClick={() => navigate(-1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
          <header className="order-history__header">
            <div className="order-history__greeting">
              <p className="order-history__name">{data.member_name ? `${data.member_name}님` : ''}</p>
              <p className="order-history__welcome">환영합니다!</p>
            </div>
            <button type="button" className="order-history__bell" aria-label="알림">
              <img src={notificationsSvg} alt="" aria-hidden />
            </button>
          </header>

          <h1 className="order-history__title">주문내역</h1>
          <div className="order-history__titleLine" aria-hidden="true" />

          <div className="order-history__filters">
            <div className="order-history__statusWrap" ref={statusRef}>
              <button
                type="button"
                className="order-history__statusSelect"
                onClick={() => setStatusDropdownOpen((v) => !v)}
                aria-expanded={statusDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="order-history__statusSelectText">주문상태({statusLabel})</span>
                <span className="order-history__statusSelectIcon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {statusDropdownOpen && (
                <ul
                  className="order-history__statusDropdown"
                  role="listbox"
                  aria-label="주문상태 선택"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <li key={opt.value} role="option" aria-selected={statusFilter === opt.value}>
                      <button
                        type="button"
                        className={`order-history__statusOption ${statusFilter === opt.value ? 'order-history__statusOption--active' : ''}`}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setStatusDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="order-history__filtersLine" aria-hidden="true" />
            <div className="order-history__dateRow">
              <span className="order-history__dateRange">{dateRangeStr}</span>
              <button type="button" className="order-history__dateBtn" onClick={openDateModal}>
                기간설정
              </button>
            </div>
          </div>

          <div className="order-history__listWrap">
            {loading ? (
              <p className="order-history__loading">로딩 중...</p>
            ) : data.orders.length === 0 ? (
              <p className="order-history__empty">주문내역이 없습니다.</p>
            ) : (
              <ul className="order-history__list">
                {data.orders.map((order) => (
                  <li key={order.id} className="order-history__item">
                    <div className="order-history__itemImgWrap">
                      <div
                        className="order-history__itemImg"
                        style={order.first_image_url ? { backgroundImage: `url(${order.first_image_url})` } : undefined}
                        aria-hidden
                      />
                      <span className="order-history__itemQtyBadge">{order.item_count ?? order.first_qty ?? 1}</span>
                    </div>
                    <div className="order-history__itemBody">
                      <p className="order-history__itemName">
                        {order.first_menu_name}
                        {order.first_menu_name ? ' 외' : ''}
                      </p>
                      <p className="order-history__itemDate">{formatDate(order.created_at)}</p>
                    </div>
                    <p className="order-history__itemPrice">{order.total_amount.toLocaleString('ko-KR')}원</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {dateModalOpen && (
        <div
          className="order-history__modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="기간 설정"
          onClick={() => setDateModalOpen(false)}
        >
          <div className="order-history__modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="order-history__modalTitle">기간 설정</h2>
            <div className="order-history__modalRow">
              <label className="order-history__modalLabel">시작일</label>
              <input
                type="date"
                className="order-history__modalInput"
                value={tempDateFrom}
                onChange={(e) => setTempDateFrom(e.target.value)}
              />
            </div>
            <div className="order-history__modalRow">
              <label className="order-history__modalLabel">종료일</label>
              <input
                type="date"
                className="order-history__modalInput"
                value={tempDateTo}
                onChange={(e) => setTempDateTo(e.target.value)}
              />
            </div>
            <div className="order-history__modalActions">
              <button type="button" className="order-history__modalCancel" onClick={() => setDateModalOpen(false)}>
                취소
              </button>
              <button type="button" className="order-history__modalApply" onClick={applyDateRange}>
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
