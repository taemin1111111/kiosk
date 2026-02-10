import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="layout">
      <header className="layout-header layout-header--login">
        <span className="brand">FELN</span>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
