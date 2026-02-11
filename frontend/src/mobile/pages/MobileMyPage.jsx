import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppOrders, clearStoredToken } from '../../api';
import notificationsSvg from '../../assets/notifications.svg';
import iconOrderHistory from '../../assets/contract.svg';
import iconCart from '../../assets/local_mall.svg';
import iconStar from '../../assets/kid_star.svg';
import iconAccount from '../../assets/account_circle.svg';
import iconSettings from '../../assets/settings.svg';

const MENU_ITEMS = [
  { key: 'order-history', label: '주문내역', path: '/menu/order-history', icon: iconOrderHistory },
  { key: 'cart', label: '장바구니', path: '/menu/cart', icon: iconCart },
  { key: 'point', label: '포인트', path: null, icon: iconStar },
  { key: 'terms', label: '약관', path: '/menu/terms', icon: iconStar },
  { key: 'account', label: '계정정보', path: null, icon: iconAccount },
  { key: 'settings', label: '설정', path: null, icon: iconSettings },
];

export default function MobileMyPage() {
  const [scale, setScale] = useState(1);
  const [memberName, setMemberName] = useState('');
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
      if (res?.ok && res.data?.member_name) setMemberName(res.data.member_name);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleMenuClick = (item) => {
    if (item.path && item.path !== '#') navigate(item.path);
  };

  const handleLogout = () => {
    clearStoredToken();
    navigate('/');
  };

  return (
    <div className="figma360-stage figma360-stage--mypage" data-node-id="836-121658">
      <div className="figma360-scale figma360-scale--mypage" style={{ '--figma360-scale': String(scale) }}>
        <div className="mypage">
          <div className="mypage__topBar">
            <button type="button" className="mypage__back" aria-label="뒤로" onClick={() => navigate(-1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
          <header className="mypage__header">
            <div className="mypage__greeting">
              <p className="mypage__name">{memberName ? `${memberName}님` : ''}</p>
              <p className="mypage__welcome">환영합니다!</p>
            </div>
            <button type="button" className="mypage__bell" aria-label="알림">
              <img src={notificationsSvg} alt="" aria-hidden />
            </button>
          </header>

          <div className="mypage__grid">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className="mypage__gridBtn"
                onClick={() => handleMenuClick(item)}
              >
                <span className="mypage__gridIcon">
                  <img src={item.icon} alt="" aria-hidden />
                </span>
                <span className="mypage__gridLabel">{item.label}</span>
              </button>
            ))}
          </div>

          <button type="button" className="mypage__logout" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
