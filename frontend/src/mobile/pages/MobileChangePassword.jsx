import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';

import logoSvg from '../../assets/Vector.svg';
import arrowBackSvg from '../../assets/arrow_back_ios_new.svg';

export default function MobileChangePassword() {
  const [scale, setScale] = useState(1);
  const [activeField, setActiveField] = useState(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state?.username ?? '';
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const [showError, setShowError] = useState(null);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const hasValue = { password: passwordValue.length > 0, confirm: confirmValue.length > 0 };
  const allFilled = passwordValue && confirmValue;
  const match = passwordValue === confirmValue;
  const showCaption = (field) => activeField === field || hasValue[field];
  const showLabel = (field) => !showCaption(field);

  const handleChangePasswordClick = async () => {
    if (!passwordValue.trim()) {
      setShowError('비밀번호를 입력해주세요.');
      return;
    }
    if (!confirmValue.trim()) {
      setShowError('비밀번호 확인을 입력해주세요.');
      return;
    }
    if (passwordValue !== confirmValue) {
      setShowMismatchModal(true);
      return;
    }
    setShowError(null);
    setIsSubmitting(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_BASE}/members/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: passwordValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setShowSuccessModal(true);
      } else {
        setShowError(data.message || '비밀번호 변경에 실패했습니다.');
      }
    } catch {
      setShowError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!username && !showSuccessModal) navigate('/find-password', { replace: true });
  }, [username, showSuccessModal, navigate]);

  return (
    <div className="figma360-stage">
      <div className="figma360-scale figma360-scale--signup" style={{ '--figma360-scale': String(scale) }}>
        <div className="changepw">
          <header className="signup__header">
            <button type="button" className="signup__back" onClick={() => navigate(-1)} aria-label="뒤로">
              <img src={arrowBackSvg} alt="" />
            </button>
            <img className="signup__logo" src={logoSvg} alt="FELN" />
          </header>

          <p className="changepw__title">비밀번호 변경하기</p>
          <p className="changepw__subtitle">새로운 비밀번호를 입력해주세요.</p>
          <p className="changepw__subtitle changepw__subtitle--second">안전한 사용을 위해 이전과 다른 비밀번호를 권장합니다.</p>
          {showError && <p className="changepw__error">{showError}</p>}

          {showCaption('password') && <p className="changepw__caption changepw__caption--password">비밀번호</p>}
          {showLabel('password') && <p className="changepw__label changepw__label--password">비밀번호</p>}
          <input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="changepw__input changepw__input--password" value={passwordValue} onChange={(e) => { setPasswordValue(e.target.value); setShowError(null); }} onFocus={() => setActiveField('password')} onBlur={() => setActiveField(null)} />
          <button type="button" className="changepw__toggle changepw__toggle--password" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? '비밀번호 가리기' : '비밀번호 보기'}>
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.82l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>
            )}
          </button>
          <div className="changepw__line changepw__line--password changepw__line--idle" aria-hidden />
          <div className="changepw__line changepw__line--password changepw__line--active" aria-hidden />

          {showCaption('confirm') && <p className="changepw__caption changepw__caption--confirm">비밀번호 확인</p>}
          {showLabel('confirm') && <p className="changepw__label changepw__label--confirm">비밀번호 확인</p>}
          <input ref={confirmRef} type={showConfirm ? 'text' : 'password'} className="changepw__input changepw__input--confirm" value={confirmValue} onChange={(e) => { setConfirmValue(e.target.value); setShowError(null); }} onFocus={() => setActiveField('confirm')} onBlur={() => setActiveField(null)} />
          <button type="button" className="changepw__toggle changepw__toggle--confirm" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? '비밀번호 확인 가리기' : '비밀번호 확인 보기'}>
            {showConfirm ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.82l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>
            )}
          </button>
          <div className="changepw__line changepw__line--confirm changepw__line--idle" aria-hidden />
          <div className="changepw__line changepw__line--confirm changepw__line--active" aria-hidden />

          <button type="button" className="changepw__hit changepw__hit--password" aria-label="비밀번호" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => passwordRef.current?.focus()} />
          <button type="button" className="changepw__hit changepw__hit--confirm" aria-label="비밀번호 확인" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => confirmRef.current?.focus()} />

          <button
            type="button"
            className={`changepw__button ${allFilled && match ? 'changepw__button--active' : ''}`}
            onClick={handleChangePasswordClick}
            disabled={isSubmitting}
          >
            <p className="changepw__buttonText">비밀번호 변경</p>
          </button>

          {showMismatchModal && (
            <>
              <div className="changepw__modalBackdrop" onClick={() => setShowMismatchModal(false)} aria-hidden />
              <div className="changepw__modal">
                <p className="changepw__modalMessage changepw__modalMessage--mismatch">비밀번호가 일치하지 않습니다<br />다시 입력해주세요</p>
                <div className="changepw__modalDivider" />
                <button type="button" className="changepw__modalConfirm" onClick={() => setShowMismatchModal(false)}>확인</button>
              </div>
            </>
          )}

          {showSuccessModal && (
            <>
              <div className="changepw__modalBackdrop" onClick={() => { setShowSuccessModal(false); navigate('/'); }} aria-hidden />
              <div className="changepw__modal">
                <p className="changepw__modalMessage changepw__modalMessage--success">비밀번호가 변경되었습니다.</p>
                <div className="changepw__modalDivider" />
                <button type="button" className="changepw__modalConfirm changepw__modalConfirm--login" onClick={() => { setShowSuccessModal(false); navigate('/'); }}>로그인 하기</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
