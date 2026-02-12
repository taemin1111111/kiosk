import { useEffect, useMemo, useState } from 'react';
import { getBoUsers, getBoOrders } from '../../api';
import clearSvg from '../../assets/clear.svg';

function formatMemberNo(id) {
  return String(id ?? '').padStart(6, '0');
}

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

function formatAmountNum(n) {
  return Number(n || 0).toLocaleString();
}

const EAT_TYPE_MAP = { IN_STORE: '매장', TAKE_OUT: '포장' };
const PAYMENT_METHOD_MAP = { CARD: '신용카드', CASH: '현금', EASY_PAY: '간편결제' };

const USER_PAGE_LIMIT = 6;

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [userOrdersModalOpen, setUserOrdersModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [userOrdersLoading, setUserOrdersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getBoUsers().catch(() => ({ ok: false }));
      if (!cancelled) {
        setUsers(res?.ok ? res.data || [] : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const id = String(u.id ?? '');
      const username = String(u.username ?? '').toLowerCase();
      const name = String(u.name ?? '').toLowerCase();
      const email = String(u.email ?? '').toLowerCase();
      return id.includes(q) || username.includes(q) || name.includes(q) || email.includes(q);
    });
  }, [users, searchQuery]);

  const totalUsers = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalUsers / USER_PAGE_LIMIT));
  const pagedUsers = useMemo(
    () => filtered.slice((page - 1) * USER_PAGE_LIMIT, page * USER_PAGE_LIMIT),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleOpenUserOrders = async (user) => {
    setSelectedUser(user);
    setUserOrdersModalOpen(true);
    setUserOrdersLoading(true);
    setUserOrders([]);
    const res = await getBoOrders({ memberId: user.id, limit: 100 }).catch(() => ({ ok: false }));
    setUserOrdersLoading(false);
    if (res?.ok && res.data?.orders) setUserOrders(res.data.orders);
    else setUserOrders([]);
  };

  const handleCloseUserOrders = () => {
    setUserOrdersModalOpen(false);
    setSelectedUser(null);
    setUserOrders([]);
  };

  return (
    <>
      <p className="admin-dashboard__breadcrumb">유저관리</p>
      <h1 className="admin-dashboard__title">유저 리스트</h1>
      <p className="admin-dashboard__summary">총 <span className="admin-dashboard__summaryNum">{totalUsers}</span> 명의<br />유저가 있습니다.</p>
      <div className="admin-dashboard__searchWrap">
        <input
          type="search"
          className="admin-dashboard__searchInput"
          placeholder="회원명, 회원번호 혹은 이메일로 검색해 주세요."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="admin-dashboard__searchIcon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
      </div>
      <div className="admin-dashboard__tableWrap">
        <table className="admin-dashboard__table">
          <thead>
            <tr className="admin-dashboard__tableHeaderRow">
              <th><span className="admin-dashboard__tableHeaderTitle">회원번호</span></th>
              <th><span className="admin-dashboard__tableHeaderTitle">회원명</span></th>
              <th><span className="admin-dashboard__tableHeaderTitle">이메일 주소</span></th>
              <th><span className="admin-dashboard__tableHeaderTitle">주문내역</span></th>
              <th><span className="admin-dashboard__tableHeaderTitle">유저 권한</span></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '18px 12px', color: 'rgba(19,19,19,0.6)' }}>
                  로딩 중...
                </td>
              </tr>
            ) : (
              pagedUsers.map((u) => (
                <tr key={u.id}>
                  <td>{formatMemberNo(u.id)}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <button type="button" className="admin-dashboard__btnDetail" onClick={() => handleOpenUserOrders(u)}>
                      상세 확인
                    </button>
                  </td>
                  <td>
                    <button type="button" className="admin-dashboard__btnDelete">계정 삭제</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="admin-dashboard__pagination">
        <button
          type="button"
          className="admin-dashboard__pageArrow"
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
              className={`admin-dashboard__pageNum ${pn === page ? 'admin-dashboard__pageNum--current' : ''}`}
              onClick={() => setPage(pn)}
            >
              {pn}
            </button>
          );
        })}
        <button
          type="button"
          className="admin-dashboard__pageArrow"
          aria-label="다음"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          ›
        </button>
      </div>

      {userOrdersModalOpen && (
        <>
          <div className="admin-order-detail__backdrop" onClick={handleCloseUserOrders} aria-hidden />
          <div className="admin-order-detail__modal admin-order-detail__modal--userOrders" role="dialog" aria-modal="true" aria-labelledby="admin-user-orders-title">
            <div className="admin-order-detail__header">
              <h2 id="admin-user-orders-title" className="admin-order-detail__title">
                주문 내역 {selectedUser?.name ? `- ${selectedUser.name}` : ''}
              </h2>
              <button type="button" className="admin-order-detail__close" onClick={handleCloseUserOrders} aria-label="닫기">
                <img src={clearSvg} alt="" width={24} height={24} />
              </button>
            </div>
            {userOrdersLoading ? (
              <div className="admin-order-detail__loading">로딩 중...</div>
            ) : userOrders.length === 0 ? (
              <div className="admin-order-detail__loading">주문 내역이 없습니다.</div>
            ) : (
              <div className="admin-order-detail__userOrdersBody">
                {userOrders.map((order) => (
                  <div key={order.id} className="admin-order-detail__sectionWrap">
                    <h3 className="admin-order-detail__sectionTitle">주문 정보</h3>
                    <div className="admin-order-detail__sectionBox">
                      <dl className="admin-order-detail__list">
                        <div className="admin-order-detail__row">
                          <dt>주문 시간</dt>
                          <dd>{formatOrderDate(order.created_at)}</dd>
                        </div>
                        <div className="admin-order-detail__row">
                          <dt>주문 상품</dt>
                          <dd>{order.product_text || '-'}</dd>
                        </div>
                        <div className="admin-order-detail__row">
                          <dt>주문 금액</dt>
                          <dd className="admin-order-detail__amount">
                            <span className="admin-order-detail__amountNum">{formatAmountNum(order.total_amount)}</span>
                            <span className="admin-order-detail__amountUnit">원</span>
                          </dd>
                        </div>
                        <div className="admin-order-detail__row">
                          <dt>식사 방법</dt>
                          <dd>{EAT_TYPE_MAP[order.eat_type] || '-'}</dd>
                        </div>
                        <div className="admin-order-detail__row">
                          <dt>결제 방법</dt>
                          <dd>{order.payment_method ? PAYMENT_METHOD_MAP[order.payment_method] || order.payment_method : '-'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
