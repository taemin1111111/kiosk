import { useEffect, useMemo, useState } from 'react';
import { getBoUsers } from '../../api';

function formatMemberNo(id) {
  // 디자인의 "회원번호" 자릿수 느낌만 맞춰서 표시
  return String(id ?? '').padStart(6, '0');
}

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const totalUsers = users.length;

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
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>{formatMemberNo(u.id)}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <button type="button" className="admin-dashboard__btnDetail">상세 확인</button>
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
        <button type="button" className="admin-dashboard__pageArrow" aria-label="이전">‹</button>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`admin-dashboard__pageNum ${n === 1 ? 'admin-dashboard__pageNum--current' : ''}`}
          >
            {n}
          </button>
        ))}
        <button type="button" className="admin-dashboard__pageArrow" aria-label="다음">›</button>
      </div>
    </>
  );
}
