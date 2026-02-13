import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { findId as findIdApi } from '../../api';

import logoSvg from '../../assets/Vector.svg';
import arrowBackSvg from '../../assets/arrow_back_ios_new.svg';

const imgLineIdle = 'https://www.figma.com/api/mcp/asset/4114c54b-844a-4dcb-a69c-96afd8df353b';
const imgPasswordLineActive = 'https://www.figma.com/api/mcp/asset/ffa0ca8d-e3c7-4058-adc8-067e63cbfa20';

export default function MobileFindId() {
  const [scale, setScale] = useState(1);
  const [activeField, setActiveField] = useState(null);
  const [nameValue, setNameValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const emailRef = useRef(null);

  /** null | 'empty' | 'not_found' — empty: 내용 입력해주세요, not_found: 입력하신 정보로 가입된 계정을 찾을 수 없습니다 (Figma 인라인) */
  const [inlineError, setInlineError] = useState(null);
  /** 성함+이메일 일치 시 찾은 아이디 (Figma 1152-6935 아이디 확인 화면) */
  const [foundUsername, setFoundUsername] = useState(null);
  const [showResultModal, setShowResultModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasValue = { name: nameValue.length > 0, email: emailValue.length > 0 };
  const isEmpty = { name: !nameValue.trim(), email: !emailValue.trim() };
  const allFilled = nameValue.trim() && emailValue.trim();
  const showCaption = (field) => activeField === field || hasValue[field];
  const showLabel = (field) => !showCaption(field);
  const isLabelError = (field) => inlineError === 'empty' && isEmpty[field];

  const handleFindIdClick = async () => {
    if (!allFilled) {
      setInlineError('empty');
      return;
    }
    setInlineError(null);
    setIsSubmitting(true);
    try {
      const data = await findIdApi({ name: nameValue.trim(), email: emailValue.trim() });
      if (data.ok && data.username) {
        setFoundUsername(data.username);
      } else {
        setInlineError('not_found');
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

  /* Figma 1152-6935: 아이디 확인 성공 화면 */
  if (foundUsername) {
    return (
      <div className="figma360-stage">
        <div className="figma360-scale figma360-scale--signup" style={{ '--figma360-scale': String(scale) }}>
          <div className="findid findid--result">
            <header className="signup__header">
              <button type="button" className="signup__back" onClick={() => navigate(-1)} aria-label="뒤로">
                <img src={arrowBackSvg} alt="" />
              </button>
              <img className="signup__logo" src={logoSvg} alt="FELN" />
            </header>
            <p className="findid__resultTitle">아이디 확인</p>
            <p className="findid__resultDesc">아이디 확인이 완료되었습니다.</p>
            <p className="findid__resultDesc findid__resultDesc--second">아이디는 다음과 같습니다.</p>
            <p className="findid__resultIdLabel">아이디</p>
            <div className="findid__resultIdBox">{foundUsername}</div>
            <button type="button" className="findid__resultButton findid__resultButton--active" onClick={() => navigate('/')}>
              로그인 하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="figma360-stage">
      <div className="figma360-scale figma360-scale--signup" style={{ '--figma360-scale': String(scale) }}>
        <div className={`findid${inlineError === 'not_found' ? ' findid--notFound' : ''}`}>
          {/* 아이디 찾기와 동일한 헤더: 기업 로고 + 뒤로 버튼 */}
          <header className="signup__header">
            <button type="button" className="signup__back" onClick={() => navigate(-1)} aria-label="뒤로">
              <img src={arrowBackSvg} alt="" />
            </button>
            <img className="signup__logo" src={logoSvg} alt="FELN" />
          </header>

          <p className="findid__title">아이디 찾기</p>
          <p className="findid__subtitle">가입 시 입력한 성함과 메일 주소를 입력해주세요</p>
          {inlineError === 'empty' && <p className="findid__errorEmpty">내용을 입력해주세요</p>}
          {inlineError === 'not_found' && <p className="findid__errorEmpty">입력하신 정보로 가입된 계정을 찾을 수 없습니다</p>}

          {showCaption('name') && <p className={`findid__caption findid__caption--name${isLabelError('name') ? ' findid__caption--error' : ''}`}>성함</p>}
          {showLabel('name') && <p className={`findid__label findid__label--name${isLabelError('name') ? ' findid__label--error' : ''}`}>성함</p>}
          <input ref={nameRef} type="text" className="findid__input findid__input--name" value={nameValue} onChange={(e) => { setNameValue(e.target.value); setInlineError(null); }} onFocus={() => setActiveField('name')} onBlur={() => setActiveField(null)} />
          <img className="findid__line findid__line--name findid__line--idle" alt="" src={imgLineIdle} />
          <img className="findid__line findid__line--name findid__line--active" alt="" src={imgPasswordLineActive} />

          {showCaption('email') && <p className={`findid__caption findid__caption--email${isLabelError('email') ? ' findid__caption--error' : ''}`}>메일 주소</p>}
          {showLabel('email') && <p className={`findid__label findid__label--email${isLabelError('email') ? ' findid__label--error' : ''}`}>메일 주소</p>}
          <input ref={emailRef} type="email" className="findid__input findid__input--email" value={emailValue} onChange={(e) => { setEmailValue(e.target.value); setInlineError(null); }} onFocus={() => setActiveField('email')} onBlur={() => setActiveField(null)} />
          <img className="findid__line findid__line--email findid__line--idle" alt="" src={imgLineIdle} />
          <img className="findid__line findid__line--email findid__line--active" alt="" src={imgPasswordLineActive} />

          <button type="button" className="findid__hit findid__hit--name" aria-label="성함" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => nameRef.current?.focus()} />
          <button type="button" className="findid__hit findid__hit--email" aria-label="메일 주소" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => emailRef.current?.focus()} />

          <button
            type="button"
            className={`findid__button ${allFilled ? 'findid__button--active' : ''}`}
            onClick={handleFindIdClick}
            disabled={isSubmitting}
          >
            <p className="findid__buttonText">아이디 찾기</p>
          </button>

          {showResultModal && (
            <>
              <div className="findid__modalBackdrop" onClick={() => setShowResultModal(null)} aria-hidden />
              <div className="findid__modal">
                <p className="findid__modalMessage" style={{ color: '#e53935' }}>{showResultModal.message}</p>
                <div className="findid__modalDivider" />
                <button type="button" className="findid__modalConfirm" onClick={() => setShowResultModal(null)}>확인</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
