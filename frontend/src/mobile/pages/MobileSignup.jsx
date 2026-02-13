import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { signup as signupApi } from '../../api';

import logoSvg from '../../assets/Vector.svg';
import arrowBackSvg from '../../assets/arrow_back_ios_new.svg';

const imgLineIdle = 'https://www.figma.com/api/mcp/asset/4114c54b-844a-4dcb-a69c-96afd8df353b';
const imgPasswordLineActive = 'https://www.figma.com/api/mcp/asset/ffa0ca8d-e3c7-4058-adc8-067e63cbfa20';

export default function MobileSignup() {
  const [scale, setScale] = useState(1);
  const [activeField, setActiveField] = useState(null);
  const [nameValue, setNameValue] = useState('');
  const [idValue, setIdValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const idRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const [showEmptyError, setShowEmptyError] = useState(false);
  const [showResultModal, setShowResultModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const hasValue = { name: nameValue.length > 0, id: idValue.length > 0, email: emailValue.length > 0, password: passwordValue.length > 0, confirm: confirmValue.length > 0 };
  const isEmpty = { name: !nameValue.trim(), id: !idValue.trim(), email: !emailValue.trim(), password: !passwordValue.trim(), confirm: !confirmValue.trim() };
  const allFilled = nameValue.trim() && idValue.trim() && emailValue.trim() && passwordValue.trim() && confirmValue.trim();
  const showCaption = (field) => activeField === field || hasValue[field];
  const showLabel = (field) => !showCaption(field);
  const isLabelError = (field) => showEmptyError && isEmpty[field];

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignupClick = async () => {
    if (!allFilled) {
      setShowEmptyError(true);
      return;
    }
    setShowEmptyError(false);
    if (!isValidEmail(emailValue.trim())) {
      setShowResultModal({ ok: false, message: '올바른 이메일 형식으로 입력해주세요.' });
      return;
    }
    if (passwordValue !== confirmValue) {
      setShowResultModal({ ok: false, message: '비밀번호가 일치하지 않습니다.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await signupApi({
        name: nameValue.trim(),
        username: idValue.trim(),
        email: emailValue.trim(),
        password: passwordValue,
      });
      if (result.ok) {
        navigate('/signup/complete', { state: { name: nameValue.trim() } });
        return;
      }
      setShowResultModal({ ok: false, message: result.message || '오류가 발생했습니다.' });
    } catch {
      setShowResultModal({ ok: false, message: '네트워크 오류가 발생했습니다.' });
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

  return (
    <div className="figma360-stage" data-node-id="1152-6342">
      <div className="figma360-scale figma360-scale--signup" style={{ '--figma360-scale': String(scale) }}>
        <div className="signup" data-name="회원가입">
          <header className="signup__header">
            <button type="button" className="signup__back" onClick={() => navigate(-1)} aria-label="뒤로">
              <img src={arrowBackSvg} alt="" />
            </button>
            <img className="signup__logo" src={logoSvg} alt="FELN" />
          </header>

          <p className="signup__title">회원가입</p>
          <p className="signup__subtitle">회원 서비스 이용을 위해 회원가입 해주세요.</p>
          {showEmptyError && <p className="signup__errorEmpty">내용을 입력해주세요</p>}

          {showCaption('name') && <p className={`signup__caption signup__caption--name${isLabelError('name') ? ' signup__caption--error' : ''}`}>성함</p>}
          {showLabel('name') && <p className={`signup__label signup__label--name${isLabelError('name') ? ' signup__label--error' : ''}`}>성함</p>}
          <input ref={nameRef} type="text" className="signup__input signup__input--name" value={nameValue} onChange={(e) => { setNameValue(e.target.value); setShowEmptyError(false); }} onFocus={() => setActiveField('name')} onBlur={() => setActiveField(null)} />
          <img className="signup__line signup__line--name signup__line--idle" alt="" src={imgLineIdle} />
          <img className="signup__line signup__line--name signup__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('id') && <p className={`signup__caption signup__caption--id${isLabelError('id') ? ' signup__caption--error' : ''}`}>아이디</p>}
          {showLabel('id') && <p className={`signup__label signup__label--id${isLabelError('id') ? ' signup__label--error' : ''}`}>아이디</p>}
          <input ref={idRef} type="text" className="signup__input signup__input--id" value={idValue} onChange={(e) => { setIdValue(e.target.value); setShowEmptyError(false); }} onFocus={() => setActiveField('id')} onBlur={() => setActiveField(null)} />
          <img className="signup__line signup__line--id signup__line--idle" alt="" src={imgLineIdle} />
          <img className="signup__line signup__line--id signup__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('email') && <p className={`signup__caption signup__caption--email${isLabelError('email') ? ' signup__caption--error' : ''}`}>메일 주소</p>}
          {showLabel('email') && <p className={`signup__label signup__label--email${isLabelError('email') ? ' signup__label--error' : ''}`}>메일 주소</p>}
          <input ref={emailRef} type="email" className="signup__input signup__input--email" value={emailValue} onChange={(e) => { setEmailValue(e.target.value); setShowEmptyError(false); }} onFocus={() => setActiveField('email')} onBlur={() => setActiveField(null)} />
          <img className="signup__line signup__line--email signup__line--idle" alt="" src={imgLineIdle} />
          <img className="signup__line signup__line--email signup__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('password') && <p className={`signup__caption signup__caption--password${isLabelError('password') ? ' signup__caption--error' : ''}`}>비밀번호</p>}
          {showLabel('password') && <p className={`signup__label signup__label--password${isLabelError('password') ? ' signup__label--error' : ''}`}>비밀번호</p>}
          <input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="signup__input signup__input--password" value={passwordValue} onChange={(e) => { setPasswordValue(e.target.value); setShowEmptyError(false); }} onFocus={() => setActiveField('password')} onBlur={() => setActiveField(null)} />
          <button type="button" className="signup__toggle signup__toggle--password" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? '비밀번호 가리기' : '비밀번호 보기'}>
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.82l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>
            )}
          </button>
          <img className="signup__line signup__line--password signup__line--idle" alt="" src={imgLineIdle} />
          <img className="signup__line signup__line--password signup__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('confirm') && <p className={`signup__caption signup__caption--confirm${isLabelError('confirm') ? ' signup__caption--error' : ''}`}>비밀번호 확인</p>}
          {showLabel('confirm') && <p className={`signup__label signup__label--confirm${isLabelError('confirm') ? ' signup__label--error' : ''}`}>비밀번호 확인</p>}
          <input ref={confirmRef} type={showConfirm ? 'text' : 'password'} className="signup__input signup__input--confirm" value={confirmValue} onChange={(e) => { setConfirmValue(e.target.value); setShowEmptyError(false); }} onFocus={() => setActiveField('confirm')} onBlur={() => setActiveField(null)} />
          <button type="button" className="signup__toggle signup__toggle--confirm" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? '비밀번호 확인 가리기' : '비밀번호 확인 보기'}>
            {showConfirm ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.82l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill="currentColor"/></svg>
            )}
          </button>
          <img className="signup__line signup__line--confirm signup__line--idle" alt="" src={imgLineIdle} />
          <img className="signup__line signup__line--confirm signup__line--active" alt="" src={imgPasswordLineActive} />

          <button type="button" className="signup__hit signup__hit--name" aria-label="성함" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => nameRef.current?.focus()} />
          <button type="button" className="signup__hit signup__hit--id" aria-label="아이디" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => idRef.current?.focus()} />
          <button type="button" className="signup__hit signup__hit--email" aria-label="메일 주소" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => emailRef.current?.focus()} />
          <button type="button" className="signup__hit signup__hit--password" aria-label="비밀번호" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => passwordRef.current?.focus()} />
          <button type="button" className="signup__hit signup__hit--confirm" aria-label="비밀번호 확인" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => confirmRef.current?.focus()} />

          <button
            type="button"
            className={`signup__button ${allFilled ? 'signup__button--active' : ''}`}
            onClick={handleSignupClick}
            disabled={isSubmitting}
          >
            <p className="signup__buttonText">회원가입 하기</p>
          </button>

          {showResultModal && (
            <>
              <div className="signup__modalBackdrop" onClick={() => setShowResultModal(null)} aria-hidden />
              <div className="signup__modal">
                <div className="signup__modalMessage">
                  {showResultModal.message}
                  {showResultModal.message === '비밀번호가 일치하지 않습니다.' && (
                    <>
                      <br />
                      다시 입력해주세요
                    </>
                  )}
                </div>
                <div className="signup__modalDivider" />
                <button
                  type="button"
                  className="signup__modalConfirm"
                  onClick={() => {
                    setShowResultModal(null);
                    if (showResultModal.ok) navigate('/');
                  }}
                >
                  확인
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
