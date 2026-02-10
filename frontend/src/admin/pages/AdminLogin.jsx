import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../../api';
import logoSvg from '../../assets/Vector.svg';

const imgLineIdle = 'https://www.figma.com/api/mcp/asset/4114c54b-844a-4dcb-a69c-96afd8df353b';
const imgLineActive = 'https://www.figma.com/api/mcp/asset/ffa0ca8d-e3c7-4058-adc8-067e63cbfa20';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [idValue, setIdValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [activeField, setActiveField] = useState(null);
  const [showIdEmptyModal, setShowIdEmptyModal] = useState(false);
  const [showPasswordEmptyModal, setShowPasswordEmptyModal] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idRef = useRef(null);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (!idValue.trim()) {
      setShowIdEmptyModal(true);
      return;
    }
    if (!passwordValue.trim()) {
      setShowPasswordEmptyModal(true);
      return;
    }
    setShowAuthError(false);
    setIsSubmitting(true);
    try {
      const data = await loginApi({ username: idValue.trim(), password: passwordValue, admin: true });
      if (data.ok) {
        navigate('/admin/dashboard');
      } else {
        setShowAuthError(true);
      }
    } catch {
      setShowAuthError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__frame">
        <img className="admin-login__logo" src={logoSvg} alt="FELN" />

        <div className="admin-login__welcome">
          <p className="admin-login__title1">안녕하세요.</p>
          <p className="admin-login__title2">카페 필른입니다.</p>
          <p className="admin-login__subtitle">관리자 서비스 이용을 위해 로그인 해주세요.</p>
        </div>

        {showAuthError && (
          <p className="admin-login__errorAuth">
            아이디 또는 비밀번호가 맞지 않습니다.<br />다시 확인해주세요.
          </p>
        )}

        <div className="admin-login__fields">
          {(activeField === 'id' || idValue.length > 0 || activeField === 'password') && (
            <p className="admin-login__caption admin-login__caption--id">아이디</p>
          )}
          {activeField !== 'id' && idValue.length === 0 && activeField !== 'password' && (
            <p className="admin-login__label admin-login__label--id">아이디</p>
          )}
          <input
            ref={idRef}
            type="text"
            className="admin-login__input admin-login__input--id"
            value={idValue}
            onChange={(e) => { setIdValue(e.target.value); setShowAuthError(false); }}
            onFocus={() => setActiveField('id')}
            onBlur={() => setActiveField(null)}
            autoComplete="username"
          />
          <img className="admin-login__line admin-login__line--id" alt="" src={activeField === 'id' ? imgLineActive : imgLineIdle} />

          {(activeField === 'password' || passwordValue.length > 0) && (
            <p className="admin-login__caption admin-login__caption--password">비밀번호</p>
          )}
          {activeField !== 'password' && passwordValue.length === 0 && (
            <p className="admin-login__label admin-login__label--password">비밀번호</p>
          )}
          <input
            ref={passwordRef}
            type="password"
            className="admin-login__input admin-login__input--password"
            value={passwordValue}
            onChange={(e) => { setPasswordValue(e.target.value); setShowAuthError(false); }}
            onFocus={() => setActiveField('password')}
            onBlur={() => setActiveField(null)}
            autoComplete="current-password"
          />
          <img className="admin-login__line admin-login__line--password" alt="" src={activeField === 'password' ? imgLineActive : imgLineIdle} />

          <button
            type="button"
            className="admin-login__hit admin-login__hit--id"
            aria-label="아이디"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => idRef.current?.focus()}
          />
          <button
            type="button"
            className="admin-login__hit admin-login__hit--password"
            aria-label="비밀번호"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => passwordRef.current?.focus()}
          />
        </div>

        <button
          type="button"
          className={`admin-login__button ${activeField === 'password' || passwordValue.length > 0 ? 'admin-login__button--active' : ''}`}
          onClick={handleLogin}
          disabled={isSubmitting}
        >
          <p className="admin-login__buttonText">로그인하기</p>
        </button>
      </div>

      {showIdEmptyModal && (
        <>
          <div className="admin-login__modalBackdrop" onClick={() => setShowIdEmptyModal(false)} aria-hidden />
          <div className="admin-login__modal">
            <p className="admin-login__modalMessage">아이디를 입력해주세요</p>
            <div className="admin-login__modalDivider" />
            <button type="button" className="admin-login__modalConfirm" onClick={() => setShowIdEmptyModal(false)}>확인</button>
          </div>
        </>
      )}

      {showPasswordEmptyModal && (
        <>
          <div className="admin-login__modalBackdrop" onClick={() => setShowPasswordEmptyModal(false)} aria-hidden />
          <div className="admin-login__modal">
            <p className="admin-login__modalMessage">비밀번호를 입력해주세요</p>
            <div className="admin-login__modalDivider" />
            <button type="button" className="admin-login__modalConfirm" onClick={() => setShowPasswordEmptyModal(false)}>확인</button>
          </div>
        </>
      )}
    </div>
  );
}
