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
  const hasValue = { name: nameValue.length > 0, id: idValue.length > 0, email: emailValue.length > 0, password: passwordValue.length > 0, confirm: confirmValue.length > 0 };
  const isEmpty = { name: !nameValue.trim(), id: !idValue.trim(), email: !emailValue.trim(), password: !passwordValue.trim(), confirm: !confirmValue.trim() };
  const allFilled = nameValue.trim() && idValue.trim() && emailValue.trim() && passwordValue.trim() && confirmValue.trim();
  const showCaption = (field) => activeField === field || hasValue[field];
  const showLabel = (field) => !showCaption(field);
  const isLabelError = (field) => showEmptyError && isEmpty[field];

  const handleSignupClick = async () => {
    if (!allFilled) {
      setShowEmptyError(true);
      return;
    }
    setShowEmptyError(false);
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
      setShowResultModal({ ok: result.ok, message: result.message || (result.ok ? '회원가입이 완료되었습니다.' : '오류가 발생했습니다.') });
      if (result.ok) {
        setNameValue('');
        setIdValue('');
        setEmailValue('');
        setPasswordValue('');
        setConfirmValue('');
      }
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
          <input ref={passwordRef} type="password" className="signup__input signup__input--password" value={passwordValue} onChange={(e) => { setPasswordValue(e.target.value); setShowEmptyError(false); }} onFocus={() => setActiveField('password')} onBlur={() => setActiveField(null)} />
          <img className="signup__line signup__line--password signup__line--idle" alt="" src={imgLineIdle} />
          <img className="signup__line signup__line--password signup__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('confirm') && <p className={`signup__caption signup__caption--confirm${isLabelError('confirm') ? ' signup__caption--error' : ''}`}>비밀번호 확인</p>}
          {showLabel('confirm') && <p className={`signup__label signup__label--confirm${isLabelError('confirm') ? ' signup__label--error' : ''}`}>비밀번호 확인</p>}
          <input ref={confirmRef} type="password" className="signup__input signup__input--confirm" value={confirmValue} onChange={(e) => { setConfirmValue(e.target.value); setShowEmptyError(false); }} onFocus={() => setActiveField('confirm')} onBlur={() => setActiveField(null)} />
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
                <p className="signup__modalMessage" style={{ color: showResultModal.ok ? '#131313' : '#e53935' }}>
                  {showResultModal.message}
                </p>
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
