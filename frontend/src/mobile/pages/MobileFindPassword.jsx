import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';

import logoSvg from '../../assets/Vector.svg';
import arrowBackSvg from '../../assets/arrow_back_ios_new.svg';

const imgLineIdle = 'https://www.figma.com/api/mcp/asset/4114c54b-844a-4dcb-a69c-96afd8df353b';
const imgPasswordLineActive = 'https://www.figma.com/api/mcp/asset/ffa0ca8d-e3c7-4058-adc8-067e63cbfa20';

export default function MobileFindPassword() {
  const [scale, setScale] = useState(1);
  const [activeField, setActiveField] = useState(null);
  const [nameValue, setNameValue] = useState('');
  const [idValue, setIdValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const idRef = useRef(null);
  const emailRef = useRef(null);

  const [inlineError, setInlineError] = useState(null);
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasValue = { name: nameValue.length > 0, id: idValue.length > 0, email: emailValue.length > 0 };
  const isEmpty = { name: !nameValue.trim(), id: !idValue.trim(), email: !emailValue.trim() };
  const allFilled = nameValue.trim() && idValue.trim() && emailValue.trim();
  const showCaption = (field) => activeField === field || hasValue[field];
  const showLabel = (field) => !showCaption(field);
  const isLabelError = (field) => inlineError === 'empty' && isEmpty[field];

  const handleFindPasswordClick = async () => {
    if (!allFilled) {
      setShowEmptyModal(true);
      return;
    }
    setInlineError(null);
    setIsSubmitting(true);
    try {
      // TODO: 백엔드 비밀번호 찾기 API 연동
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${API_BASE}/members/find-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameValue.trim(),
          username: idValue.trim(),
          email: emailValue.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setShowResultModal({ ok: true, type: 'success' });
      } else {
        setShowResultModal({ ok: false, message: data.message || '입력하신 정보로 가입된 계정을 찾을 수 없습니다.' });
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
    <div className="figma360-stage">
      <div className="figma360-scale figma360-scale--signup" style={{ '--figma360-scale': String(scale) }}>
        <div className="findpw">
          {/* 아이디 찾기와 동일한 헤더: < 버튼 + 로고 */}
          <header className="signup__header">
            <button type="button" className="signup__back" onClick={() => navigate(-1)} aria-label="뒤로">
              <img src={arrowBackSvg} alt="" />
            </button>
            <img className="signup__logo" src={logoSvg} alt="FELN" />
          </header>

          <p className="findpw__title">비밀번호 찾기</p>
          <p className="findpw__subtitle">가입 시 등록한 아이디와 메일 주소를 입력해주세요</p>

          {showCaption('name') && <p className={`findpw__caption findpw__caption--name${isLabelError('name') ? ' findpw__caption--error' : ''}`}>성함</p>}
          {showLabel('name') && <p className={`findpw__label findpw__label--name${isLabelError('name') ? ' findpw__label--error' : ''}`}>성함</p>}
          <input ref={nameRef} type="text" className="findpw__input findpw__input--name" value={nameValue} onChange={(e) => { setNameValue(e.target.value); setInlineError(null); }} onFocus={() => setActiveField('name')} onBlur={() => setActiveField(null)} />
          <img className="findpw__line findpw__line--name findpw__line--idle" alt="" src={imgLineIdle} />
          <img className="findpw__line findpw__line--name findpw__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('id') && <p className={`findpw__caption findpw__caption--id${isLabelError('id') ? ' findpw__caption--error' : ''}`}>아이디</p>}
          {showLabel('id') && <p className={`findpw__label findpw__label--id${isLabelError('id') ? ' findpw__label--error' : ''}`}>아이디</p>}
          <input ref={idRef} type="text" className="findpw__input findpw__input--id" value={idValue} onChange={(e) => { setIdValue(e.target.value); setInlineError(null); }} onFocus={() => setActiveField('id')} onBlur={() => setActiveField(null)} />
          <img className="findpw__line findpw__line--id findpw__line--idle" alt="" src={imgLineIdle} />
          <img className="findpw__line findpw__line--id findpw__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('email') && <p className={`findpw__caption findpw__caption--email${isLabelError('email') ? ' findpw__caption--error' : ''}`}>메일 주소</p>}
          {showLabel('email') && <p className={`findpw__label findpw__label--email${isLabelError('email') ? ' findpw__label--error' : ''}`}>메일 주소</p>}
          <input ref={emailRef} type="email" className="findpw__input findpw__input--email" value={emailValue} onChange={(e) => { setEmailValue(e.target.value); setInlineError(null); }} onFocus={() => setActiveField('email')} onBlur={() => setActiveField(null)} />
          <img className="findpw__line findpw__line--email findpw__line--idle" alt="" src={imgLineIdle} />
          <img className="findpw__line findpw__line--email findpw__line--active" alt="" src={imgPasswordLineActive} />

          <button type="button" className="findpw__hit findpw__hit--name" aria-label="성함" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => nameRef.current?.focus()} />
          <button type="button" className="findpw__hit findpw__hit--id" aria-label="아이디" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => idRef.current?.focus()} />
          <button type="button" className="findpw__hit findpw__hit--email" aria-label="메일 주소" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => emailRef.current?.focus()} />

          <button
            type="button"
            className={`findpw__button ${allFilled ? 'findpw__button--active' : ''}`}
            onClick={handleFindPasswordClick}
            disabled={isSubmitting}
          >
            <p className="findpw__buttonText">비밀번호 찾기</p>
          </button>

          {showEmptyModal && (
            <>
              <div className="findpw__modalBackdrop" onClick={() => setShowEmptyModal(false)} aria-hidden />
              <div className="findpw__modal">
                <p className="findpw__modalMessage findpw__modalMessage--dark">내용을 모두 입력해주세요</p>
                <div className="findpw__modalDivider" />
                <button type="button" className="findpw__modalConfirm" onClick={() => setShowEmptyModal(false)}>확인</button>
              </div>
            </>
          )}

          {showResultModal && (
            <>
              <div className="findpw__modalBackdrop" onClick={() => setShowResultModal(null)} aria-hidden />
              <div className="findpw__modal">
                {showResultModal.ok && showResultModal.type === 'success' ? (
                  <>
                    <p className="findpw__modalMessage findpw__modalMessage--success">입력하신 메일 주소로<br />비밀번호 재설정 링크가 발송되었습니다</p>
                    <div className="findpw__modalDivider" />
                    <button type="button" className="findpw__modalConfirm" onClick={() => { setShowResultModal(null); navigate('/change-password', { state: { username: idValue.trim() } }); }}>확인</button>
                  </>
                ) : (
                  <>
                    <p className="findpw__modalMessage">{showResultModal.message}</p>
                    <div className="findpw__modalDivider" />
                    <button type="button" className="findpw__modalConfirm" onClick={() => setShowResultModal(null)}>확인</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
