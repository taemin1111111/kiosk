import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import logoSvg from '../../assets/Vector.svg';
import chevronDownSvg from '../../assets/ChevronDown.svg';

const SIDEBAR_MENUS = [
  { label: '유저관리', children: [{ to: '/admin/dashboard', label: '유저 리스트' }] },
  { label: '주문관리', children: [{ to: '/admin/orders', label: '주문 내역' }] },
  { label: '메뉴관리', children: [{ to: '/admin/menus', label: '메뉴 리스트' }, { to: '/admin/menus/register', label: '메뉴 등록하기' }] },
  { label: '약관관리', children: [{ to: '/admin/terms', label: '서비스 이용약관' }, { to: '/admin/terms/privacy', label: '개인정보 처리방침' }] },
];

export default function AdminShell() {
  const [expandedMenus, setExpandedMenus] = useState(['유저관리', '주문관리', '메뉴관리']);

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__topHeader">
        <div className="admin-dashboard__topHeaderEmpty" aria-hidden />
        <div className="admin-dashboard__topHeaderInner">
          <img className="admin-dashboard__logo" src={logoSvg} alt="FELN" />
          <p className="admin-dashboard__welcome">노빌더님,<br />안녕하세요.</p>
        </div>
        <div className="admin-dashboard__topHeaderLineWrap">
          <svg className="admin-dashboard__topHeaderLine" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 5" fill="none" aria-hidden>
            <path d="M1920 -4.36899e-08L1920 5L-1.13829e-10 5L0 0L1920 -4.36899e-08Z" fill="#131313" fillOpacity="0.1" />
          </svg>
        </div>
      </header>
      <div className="admin-dashboard__body">
        <aside className="admin-dashboard__sidebar">
          <nav className="admin-dashboard__nav">
            {SIDEBAR_MENUS.map((menu) => (
              <div key={menu.label} className="admin-dashboard__navSection">
                <button
                  type="button"
                  className="admin-dashboard__navSectionTitle"
                  onClick={() => setExpandedMenus((prev) => (prev.includes(menu.label) ? prev.filter((m) => m !== menu.label) : [...prev, menu.label]))}
                >
                  {menu.label}
                  <span className={`admin-dashboard__navArrow ${expandedMenus.includes(menu.label) ? 'admin-dashboard__navArrow--down' : 'admin-dashboard__navArrow--right'}`} aria-hidden>
                    <img src={chevronDownSvg} alt="" width={18} height={18} />
                  </span>
                </button>
                {expandedMenus.includes(menu.label) && (
                  <ul className="admin-dashboard__navList">
                    {menu.children.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end
                          className={({ isActive }) =>
                            `admin-dashboard__navLink ${isActive ? 'admin-dashboard__navLink--active' : ''}`
                          }
                        >
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
        </aside>
        <main className="admin-dashboard__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
