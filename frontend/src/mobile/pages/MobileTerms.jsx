import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppOrders } from '../../api';
import notificationsSvg from '../../assets/notifications.svg';

const MEMBER_NAME_CACHE_KEY = 'kiosk_member_name';

const TERMS_ITEMS = [
  { key: 'service', label: '서비스 이용약관', path: '/menu/terms/service' },
  { key: 'privacy', label: '개인정보 처리방침', path: '/menu/terms/privacy' },
];

export default function MobileTerms() {
  const [scale, setScale] = useState(1);
  const [memberName, setMemberName] = useState(() => {
    try {
      return localStorage.getItem(MEMBER_NAME_CACHE_KEY) || '';
    } catch {
      return '';
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getAppOrders({}).catch(() => ({ ok: false }));
      if (cancelled) return;
      if (res?.ok && res.data?.member_name) {
        const name = res.data.member_name;
        setMemberName(name);
        try {
          localStorage.setItem(MEMBER_NAME_CACHE_KEY, name);
        } catch (_) {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRowClick = (path) => {
    if (path) navigate(path);
  };

  return (
    <div className="figma360-stage figma360-stage--terms" data-node-id="836-119419">
      <div className="figma360-scale figma360-scale--terms" style={{ '--figma360-scale': String(scale) }}>
        <div className="terms">
          <div className="terms__topBar">
            <button type="button" className="terms__back" aria-label="뒤로" onClick={() => navigate(-1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
          <header className="terms__header">
            <div className="terms__greeting">
              <p className="terms__name">{memberName ? `${memberName}님` : ''}</p>
              <p className="terms__welcome">환영합니다!</p>
            </div>
            <button type="button" className="terms__bell" aria-label="알림">
              <img src={notificationsSvg} alt="" aria-hidden />
            </button>
          </header>

          <div className="terms__list">
            {TERMS_ITEMS.map((item, index) => (
              <div key={item.key}>
                <button
                  type="button"
                  className="terms__row"
                  onClick={() => handleRowClick(item.path)}
                >
                  <span className="terms__rowLabel">{item.label}</span>
                  <span className="terms__rowChevron" aria-hidden>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </button>
                {index < TERMS_ITEMS.length - 1 && <div className="terms__divider" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
