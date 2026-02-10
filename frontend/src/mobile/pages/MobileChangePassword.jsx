import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';

import logoSvg from '../../assets/Vector.svg';
import arrowBackSvg from '../../assets/arrow_back_ios_new.svg';

const imgLineIdle = 'https://www.figma.com/api/mcp/asset/4114c54b-844a-4dcb-a69c-96afd8df353b';
const imgPasswordLineActive = 'https://www.figma.com/api/mcp/asset/ffa0ca8d-e3c7-4058-adc8-067e63cbfa20';

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
          <input ref={passwordRef} type="password" className="changepw__input changepw__input--password" value={passwordValue} onChange={(e) => { setPasswordValue(e.target.value); setShowError(null); }} onFocus={() => setActiveField('password')} onBlur={() => setActiveField(null)} />
          <img className="changepw__line changepw__line--password" alt="" src={activeField === 'password' ? imgPasswordLineActive : imgLineIdle} />

          {showCaption('confirm') && <p className="changepw__caption changepw__caption--confirm">비밀번호 확인</p>}
          {showLabel('confirm') && <p className="changepw__label changepw__label--confirm">비밀번호 확인</p>}
          <input ref={confirmRef} type="password" className="changepw__input changepw__input--confirm" value={confirmValue} onChange={(e) => { setConfirmValue(e.target.value); setShowError(null); }} onFocus={() => setActiveField('confirm')} onBlur={() => setActiveField(null)} />
          <img className="changepw__line changepw__line--confirm" alt="" src={activeField === 'confirm' ? imgPasswordLineActive : imgLineIdle} />

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
