import { Routes, Route } from 'react-router-dom';

import MobileLayout from './mobile/layout/MobileLayout';
import MobileLogin from './mobile/pages/MobileLogin';
import MobileSignup from './mobile/pages/MobileSignup';
import MobileFindId from './mobile/pages/MobileFindId';
import MobileFindPassword from './mobile/pages/MobileFindPassword';
import MobileChangePassword from './mobile/pages/MobileChangePassword';
import MobileMenu from './mobile/pages/MobileMenu';
import MobileMenuDetail from './mobile/pages/MobileMenuDetail';
import MobileNotFound from './mobile/pages/MobileNotFound';

import AdminLayout from './admin/layout/AdminLayout';
import AdminShell from './admin/layout/AdminShell';
import AdminLogin from './admin/pages/AdminLogin';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminMenuList from './admin/pages/AdminMenuList';
import AdminMenuRegister from './admin/pages/AdminMenuRegister';
import AdminServiceTerms from './admin/pages/AdminServiceTerms';
import AdminPrivacyPolicy from './admin/pages/AdminPrivacyPolicy';

function App() {
  return (
    <Routes>
      {/* 백오피스 (관리자) - /admin/* */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminLogin />} />
        <Route path="login" element={<AdminLogin />} />
        <Route element={<AdminShell />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="menus" element={<AdminMenuList />} />
          <Route path="menus/register" element={<AdminMenuRegister />} />
          <Route path="menus/:id/edit" element={<AdminMenuRegister />} />
          <Route path="terms" element={<AdminServiceTerms />} />
          <Route path="terms/privacy" element={<AdminPrivacyPolicy />} />
        </Route>
      </Route>

      {/* 모바일/키오스크 (사용자) - / 또는 /signup */}
      <Route path="/" element={<MobileLayout />}>
        <Route index element={<MobileLogin />} />
        <Route path="signup" element={<MobileSignup />} />
        <Route path="find-id" element={<MobileFindId />} />
        <Route path="find-password" element={<MobileFindPassword />} />
        <Route path="change-password" element={<MobileChangePassword />} />
        <Route path="menu" element={<MobileMenu />} />
        <Route path="menu/:id" element={<MobileMenuDetail />} />
        <Route path="*" element={<MobileNotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
