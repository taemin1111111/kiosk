import { useEffect, useState, useMemo } from 'react';
import { getBoOrders, getBoOrderDetail, patchBoOrderConfirm, patchBoOrderCancel } from '../../api';
import clearSvg from '../../assets/clear.svg';

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${y}.${m}.${d}`;
}

const PERIOD_PRESETS = [
  { id: 'all', label: '전체', getRange: () => { const end = new Date(); const start = new Date(); start.setFullYear(start.getFullYear() - 3); return { from: toYMD(start), to: toYMD(end) }; } },
  { id: '1m', label: '1개월 전', getRange: () => { const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 1); return { from: toYMD(start), to: toYMD(end) }; } },
  { id: '3m', label: '3개월 전', getRange: () => { const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 3); return { from: toYMD(start), to: toYMD(end) }; } },
  { id: '6m', label: '6개월 전', getRange: () => { const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 6); return { from: toYMD(start), to: toYMD(end) }; } },
  { id: '1y', label: '1년 전', getRange: () => { const end = new Date(); const start = new Date(); start.setFullYear(start.getFullYear() - 1); return { from: toYMD(start), to: toYMD(end) }; } },
  { id: '2y', label: '2년 전', getRange: () => { const end = new Date(); const start = new Date(); start.setFullYear(start.getFullYear() - 2); return { from: toYMD(start), to: toYMD(end) }; } },
  { id: '3y', label: '3년 전', getRange: () => { const end = new Date(); const start = new Date(); start.setFullYear(start.getFullYear() - 3); return { from: toYMD(start), to: toYMD(end) }; } },
];

const STATUS_MAP = {
  PENDING: '확인 중',
  PAID: '픽업 완료',
  CANCELLED: '주문 취소됨',
  FAILED: '주문 취소됨',
};

function formatOrderDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function formatAmount(n) {
  return Number(n || 0).toLocaleString() + '원';
}

function formatAmountNum(n) {
  return Number(n || 0).toLocaleString();
}

function getStatusClass(status) {
  if (status === 'PAID') return 'admin-order-history__status--complete';
  if (status === 'CANCELLED' || status === 'FAILED') return 'admin-order-history__status--cancelled';
  return 'admin-order-history__status--default';
}

const EAT_TYPE_MAP = { IN_STORE: '매장', TAKE_OUT: '포장' };
const PAYMENT_METHOD_MAP = { CARD: '신용카드', CASH: '현금', EASY_PAY: '간편결제', TRANSFER: '계좌이체' };

const STATUS_OPTIONS = [
  { value: 'ALL', label: '주문상태(전체)' },
  { value: 'PENDING', label: '확인 중' },
  { value: 'PAID', label: '픽업 완료' },
  { value: 'CANCELLED', label: '주문 취소됨' },
  { value: 'FAILED', label: '결제 실패' },
];

export default function AdminOrderHistory() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [confirmModalOrderId, setConfirmModalOrderId] = useState(null);
  const limit = 6;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // 일반 사용자 주문내역(MobileOrderHistory)과 동일: 기본 최근 1개월
  const defaultRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return { from: toYMD(start), to: toYMD(end) };
  }, []);
  const effectiveDateFrom = dateFrom || defaultRange.from;
  const effectiveDateTo = dateTo || defaultRange.to;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const params = { page, limit, dateFrom: effectiveDateFrom, dateTo: effectiveDateTo };
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      const res = await getBoOrders(params).catch(() => ({ ok: false }));
      if (!cancelled) {
        if (res?.ok) {
          setOrders(res.data?.orders || []);
          setTotal(res.data?.total ?? 0);
        } else {
          setOrders([]);
          setTotal(0);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, statusFilter, effectiveDateFrom, effectiveDateTo]);

  const periodOptions = useMemo(
    () => PERIOD_PRESETS.map((p) => ({ ...p, range: p.getRange() })),
    [datePopoverOpen]
  );

  const selectedPresetId = useMemo(() => {
    const match = periodOptions.find((o) => o.range.from === effectiveDateFrom && o.range.to === effectiveDateTo);
    return match ? match.id : null;
  }, [periodOptions, effectiveDateFrom, effectiveDateTo]);

  const handleSelectPeriod = (from, to) => {
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

  const handleSelectStatus = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleOpenDetail = async (orderId) => {
    setDetailModalOpen(true);
    setDetailOrder(null);
    setDetailLoading(true);
    const res = await getBoOrderDetail(orderId).catch(() => ({ ok: false }));
    setDetailLoading(false);
    if (res?.ok) setDetailOrder(res.data);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setDetailOrder(null);
  };

  useEffect(() => {
    if (detailModalOpen || confirmModalOrderId != null) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [detailModalOpen, confirmModalOrderId]);

  const handleConfirmOrder = async (orderId) => {
    setConfirmModalOrderId(null);
    const res = await patchBoOrderConfirm(orderId).catch(() => ({ ok: false }));
    if (res?.ok) {
      const params = { page, limit, dateFrom: effectiveDateFrom, dateTo: effectiveDateTo };
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      const listRes = await getBoOrders(params).catch(() => ({ ok: false }));
      if (listRes?.ok) {
        setOrders(listRes.data?.orders || []);
        setTotal(listRes.data?.total ?? 0);
      }
      if (detailOrder?.id === orderId) setDetailOrder((prev) => (prev ? { ...prev, status: 'PAID' } : null));
    } else {
      alert(res?.message || '픽업 완료 처리에 실패했습니다.');
    }
  };

  const handleCancelOrder = async () => {
    if (!detailOrder?.id) return;
    const res = await patchBoOrderCancel(detailOrder.id).catch(() => ({ ok: false }));
    if (res?.ok) {
      handleCloseDetail();
      const params = { page, limit, dateFrom: effectiveDateFrom, dateTo: effectiveDateTo };
      if (statusFilter && statusFilter !== 'ALL') params.status = statusFilter;
      const listRes = await getBoOrders(params).catch(() => ({ ok: false }));
      if (listRes?.ok) {
        setOrders(listRes.data?.orders || []);
        setTotal(listRes.data?.total ?? 0);
      }
    } else {
      alert(res?.message || '주문 취소에 실패했습니다.');
    }
  };

  return (
    <>
      <p className="admin-order-history__breadcrumb">주문 관리</p>
      <h1 className="admin-order-history__title">주문 내역</h1>
      <p className="admin-order-history__summary">
        총 <span className="admin-order-history__summaryNum">{total}</span> 개의 주문 내역이 있습니다.
      </p>

      <div className="admin-order-history__filters">
        <div className="admin-order-history__dateWrap" role="group" aria-label="조회 기간">
          <button
            type="button"
            className="admin-order-history__dateTrigger"
            onClick={() => setDatePopoverOpen((v) => !v)}
            aria-expanded={datePopoverOpen}
            aria-haspopup="dialog"
          >
            <span className="admin-order-history__dateTriggerLabel">
              {dateFrom && dateTo
                ? `${formatDateDisplay(effectiveDateFrom)} - ${formatDateDisplay(effectiveDateTo)}`
                : '기간을 선택해주세요'}
            </span>
          </button>
          <span className="admin-order-history__dateRight">
            <span className="admin-order-history__dateDivider" aria-hidden />
            <button
              type="button"
              className="admin-order-history__dateBtn"
              onClick={() => setDatePopoverOpen(true)}
            >
              기간설정
            </button>
          </span>
          {datePopoverOpen && (
            <>
              <div className="admin-order-history__datePopoverBackdrop" onClick={() => setDatePopoverOpen(false)} aria-hidden />
              <div className="admin-order-history__dateDropdown" role="listbox" aria-label="기간 선택">
                {periodOptions.map((opt) => {
                  const isSelected = selectedPresetId === opt.id;
                  const rangeText = `${formatDateDisplay(opt.range.from)} - ${formatDateDisplay(opt.range.to)}`;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className="admin-order-history__dateDropdownItem"
                      onClick={(e) => { e.stopPropagation(); handleSelectPeriod(opt.range.from, opt.range.to); }}
                    >
                      <span className="admin-order-history__dateDropdownLabel">
                        {opt.label} <span className="admin-order-history__dateDropdownRange">({rangeText})</span>
                      </span>
                      <span className={`admin-order-history__dateDropdownRadio ${isSelected ? 'admin-order-history__dateDropdownRadio--selected' : ''}`} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="admin-order-history__statusSelectWrap" role="group" aria-label="주문상태">
          <button
            type="button"
            className="admin-order-history__statusTrigger"
            onClick={() => setStatusDropdownOpen((v) => !v)}
            aria-expanded={statusDropdownOpen}
            aria-haspopup="listbox"
          >
            {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? '주문상태(전체)'}
          </button>
          <button type="button" className="admin-order-history__statusSelectRight" onClick={() => setStatusDropdownOpen(true)} aria-label="주문상태 선택 열기">
            <span className="admin-order-history__statusSelectDivider" aria-hidden />
            <span className="admin-order-history__statusSelectArrow" aria-hidden />
          </button>
          {statusDropdownOpen && (
            <>
              <div className="admin-order-history__statusDropdownBackdrop" onClick={() => setStatusDropdownOpen(false)} aria-hidden />
              <div className="admin-order-history__statusDropdown" role="listbox" aria-label="주문상태 선택">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className="admin-order-history__statusDropdownItem"
                      onClick={(e) => { e.stopPropagation(); handleSelectStatus(opt.value); }}
                    >
                      <span className="admin-order-history__statusDropdownLabel">{opt.label}</span>
                      <span className={`admin-order-history__statusDropdownRadio ${isSelected ? 'admin-order-history__statusDropdownRadio--selected' : ''}`} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="admin-order-history__tableWrap">
        <table className="admin-order-history__table">
          <thead>
            <tr className="admin-order-history__tableHeaderRow">
              <th><span className="admin-order-history__tableHeaderTitle">번호</span></th>
              <th><span className="admin-order-history__tableHeaderTitle">상품 정보</span></th>
              <th><span className="admin-order-history__tableHeaderTitle">주문 시간</span></th>
              <th><span className="admin-order-history__tableHeaderTitle">주문 금액</span></th>
              <th><span className="admin-order-history__tableHeaderTitle">성함</span></th>
              <th><span className="admin-order-history__tableHeaderTitle">주문 확인</span></th>
              <th><span className="admin-order-history__tableHeaderTitle">상태</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-order-history__loadingCell">
                  로딩 중...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-order-history__emptyCell">
                  주문 내역이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((o, idx) => (
                <tr key={o.id}>
                  <td>{(page - 1) * limit + idx + 1}</td>
                  <td>{o.product_text || '-'}</td>
                  <td>{formatOrderDate(o.created_at)}</td>
                  <td>{formatAmount(o.total_amount)}</td>
                  <td>{o.member_name || '-'}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-order-history__btnDetail"
                      onClick={() => handleOpenDetail(o.id)}
                    >
                      상세 확인
                    </button>
                  </td>
                  <td>
                    {o.status === 'PENDING' ? (
                      <button
                        type="button"
                        className={`admin-order-history__status admin-order-history__status--clickable ${getStatusClass(o.status)}`}
                        onClick={() => setConfirmModalOrderId(o.id)}
                      >
                        {STATUS_MAP[o.status] ?? o.status}
                      </button>
                    ) : (
                      <span className={`admin-order-history__status ${getStatusClass(o.status)}`}>
                        {STATUS_MAP[o.status] ?? o.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-order-history__pagination">
        <button
          type="button"
          className="admin-order-history__pageArrow"
          aria-label="이전"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ‹
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pn = i + 1;
          if (totalPages > 5) {
            const half = Math.floor(5 / 2);
            const start = Math.max(1, Math.min(page - half, totalPages - 4));
            pn = start + i;
          }
          return (
            <button
              key={pn}
              type="button"
              className={`admin-order-history__pageNum ${pn === page ? 'admin-order-history__pageNum--current' : ''}`}
              onClick={() => setPage(pn)}
            >
              {pn}
            </button>
          );
        })}
        <button
          type="button"
          className="admin-order-history__pageArrow"
          aria-label="다음"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          ›
        </button>
      </div>

      {detailModalOpen && (
        <>
          <div className="admin-order-detail__backdrop" onClick={handleCloseDetail} aria-hidden />
          <div className="admin-order-detail__modal" role="dialog" aria-modal="true" aria-labelledby="admin-order-detail-title">
            <div className="admin-order-detail__header">
              <h2 id="admin-order-detail-title" className="admin-order-detail__title">주문 내역 상세보기</h2>
              <button type="button" className="admin-order-detail__close" onClick={handleCloseDetail} aria-label="닫기">
                <img src={clearSvg} alt="" width={24} height={24} />
              </button>
            </div>
            {detailLoading ? (
              <div className="admin-order-detail__loading">로딩 중...</div>
            ) : detailOrder ? (
              <>
                <div className="admin-order-detail__sectionWrap">
                  <h3 className="admin-order-detail__sectionTitle">1. 주문 정보</h3>
                  <div className="admin-order-detail__sectionBox">
                  <dl className="admin-order-detail__list">
                    <div className="admin-order-detail__row">
                      <dt>주문 시간</dt>
                      <dd>{formatOrderDate(detailOrder.paid_at || detailOrder.created_at)}</dd>
                    </div>
                    <div className="admin-order-detail__row">
                      <dt>주문 상품</dt>
                      <dd>{detailOrder.product_text || '-'}</dd>
                    </div>
                    <div className="admin-order-detail__row">
                      <dt>주문 금액</dt>
                      <dd className="admin-order-detail__amount">
                        <span className="admin-order-detail__amountNum">{formatAmountNum(detailOrder.total_amount)}</span>
                        <span className="admin-order-detail__amountUnit">원</span>
                      </dd>
                    </div>
                    <div className="admin-order-detail__row">
                      <dt>식사 방법</dt>
                      <dd>{EAT_TYPE_MAP[detailOrder.eat_type] || '-'}</dd>
                    </div>
                  </dl>
                  </div>
                </div>
                <div className="admin-order-detail__sectionWrap">
                  <h3 className="admin-order-detail__sectionTitle">2. 주문자 정보</h3>
                  <div className="admin-order-detail__sectionBox">
                  <dl className="admin-order-detail__list">
                    <div className="admin-order-detail__row">
                      <dt>주문자 성함</dt>
                      <dd>{detailOrder.member_name || '-'}</dd>
                    </div>
                    <div className="admin-order-detail__row">
                      <dt>회원번호</dt>
                      <dd>{detailOrder.member_id ? String(detailOrder.member_id).padStart(6, '0') : '-'}</dd>
                    </div>
                    <div className="admin-order-detail__row">
                      <dt>결제방법</dt>
                      <dd>{detailOrder.payment ? PAYMENT_METHOD_MAP[detailOrder.payment.method] || detailOrder.payment.method : '-'}</dd>
                    </div>
                  </dl>
                  </div>
                </div>
                <button type="button" className="admin-order-detail__cancelBtn" onClick={handleCancelOrder}>
                  결제 취소
                </button>
              </>
            ) : (
              <div className="admin-order-detail__error">주문 정보를 불러올 수 없습니다.</div>
            )}
          </div>
        </>
      )}

      {confirmModalOrderId != null && (
        <>
          <div className="admin-order-detail__backdrop" onClick={() => setConfirmModalOrderId(null)} aria-hidden />
          <div className="admin-order-history__confirmModal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
            <p id="confirm-modal-title" className="admin-order-history__confirmModalText">
              픽업 완료로 상태를 변경 하시나요?
            </p>
            <div className="admin-order-history__confirmModalActions">
              <button type="button" className="admin-order-history__confirmModalBtn admin-order-history__confirmModalBtn--yes" onClick={() => handleConfirmOrder(confirmModalOrderId)}>
                예
              </button>
              <button type="button" className="admin-order-history__confirmModalBtn admin-order-history__confirmModalBtn--no" onClick={() => setConfirmModalOrderId(null)}>
                아니요
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
