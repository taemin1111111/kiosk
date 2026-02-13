import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { login as loginApi } from '../../api';

import logoSvg from '../../assets/Vector.svg';
const imgLine45 = 'https://www.figma.com/api/mcp/asset/ddc9a3af-9a14-47f7-8a10-f05a6f2e2ea3';
const imgLineIdle = 'https://www.figma.com/api/mcp/asset/4114c54b-844a-4dcb-a69c-96afd8df353b';
const imgPasswordLineActive = 'https://www.figma.com/api/mcp/asset/ffa0ca8d-e3c7-4058-adc8-067e63cbfa20';

export default function MobileLogin() {
  const navigate = useNavigate();
  const [scale, setScale] = useState(1);
  const [idValue, setIdValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [activeField, setActiveField] = useState(null);
  const [showIdEmptyModal, setShowIdEmptyModal] = useState(false);
  const [showPasswordEmptyModal, setShowPasswordEmptyModal] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const idRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="figma360-stage" data-node-id="834:38358">
      <div className="figma360-scale" style={{ '--figma360-scale': String(scale) }}>
        <div className="login01" data-name="로그인01">
          <img className="login01__logo" alt="FELN" src={logoSvg} data-node-id="834:38360" />

          <div className="login01__welcome" data-node-id="834:38361">
            <div className="login01__welcomeTitle" data-node-id="834:38362">
              <p className="login01__p">안녕하세요.</p>
              <p className="login01__p">카페 필른입니다.</p>
            </div>
            <p className="login01__welcomePrompt" data-node-id="834:38363">
              회원 서비스 이용을 위해 로그인 해주세요.
            </p>
          </div>

          {showAuthError && (
            <p className="login01__errorAuth" data-node-id="834:38475">
              아이디 또는 비밀번호가 맞지 않습니다.<br />다시 확인해주세요.
            </p>
          )}

          <div
            className={`login01__fields ${idValue.length > 0 ? 'login01__fields--id-filled' : ''} ${passwordValue.length > 0 ? 'login01__fields--password-filled' : ''}`}
            data-node-id="834:38364"
          >
            {(activeField === 'id' || idValue.length > 0 || activeField === 'password') && (
              <p className="login01__caption login01__caption--id" data-node-id="834:38384">아이디</p>
            )}
            {activeField !== 'id' && idValue.length === 0 && activeField !== 'password' && (
              <p className="login01__label login01__label--id" data-node-id="834:38367">아이디</p>
            )}
            <input
              ref={idRef}
              className="login01__input login01__input--id"
              value={idValue}
              onChange={(e) => { setIdValue(e.target.value); setShowAuthError(false); }}
              onFocus={() => setActiveField('id')}
              onBlur={() => setActiveField(null)}
              autoComplete="username"
            />
            <img className="login01__line328 login01__line328--id login01__line328--idle" alt="" src={imgLineIdle} data-node-id="834:38368" />
            <img className="login01__line328 login01__line328--id login01__line328--active" alt="" src={imgPasswordLineActive} data-node-id="834:38368" />

            {(activeField === 'password' || passwordValue.length > 0) && (
              <p className="login01__caption login01__caption--password" data-node-id="834:38419">비밀번호</p>
            )}
            {activeField !== 'password' && passwordValue.length === 0 && (
              <p className="login01__label login01__label--password" data-node-id="834:38370">비밀번호</p>
            )}
            <input
              ref={passwordRef}
              className="login01__input login01__input--password"
              type="password"
              value={passwordValue}
              onChange={(e) => { setPasswordValue(e.target.value); setShowAuthError(false); }}
              onFocus={() => setActiveField('password')}
              onBlur={() => setActiveField(null)}
              autoComplete="current-password"
            />
            <img className="login01__line328 login01__line328--password login01__line328--idle" alt="" src={imgLineIdle} data-node-id="834:38371" />
            <img className="login01__line328 login01__line328--password login01__line328--active" alt="" src={imgPasswordLineActive} data-node-id="834:38436" />

            <div className="login01__links" data-node-id="834:38372">
              <Link to="/find-id" className="login01__linkText login01__linkText--findId" data-node-id="834:38373">아이디 찾기</Link>
              <img className="login01__divider login01__divider--1" alt="" src={imgLine45} data-node-id="834:38374" />
              <Link to="/find-password" className="login01__linkText login01__linkText--findPassword" data-node-id="834:38375">비밀번호 찾기</Link>
              <img className="login01__divider login01__divider--2" alt="" src={imgLine45} data-node-id="834:38376" />
              <Link to="/signup" className="login01__linkText login01__linkText--signup" data-node-id="834:38377">회원가입</Link>
            </div>

            <button type="button" className="login01__hit login01__hit--id" aria-label="아이디 영역" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => idRef.current?.focus()} />
            <button type="button" className="login01__hit login01__hit--password" aria-label="비밀번호 영역" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => passwordRef.current?.focus()} />
          </div>

          <button
            type="button"
            className={`login01__button ${activeField === 'password' || passwordValue.length > 0 ? 'login01__button--active' : ''}`}
            data-node-id="834:38378"
            onClick={async () => {
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
                const data = await loginApi({ username: idValue.trim(), password: passwordValue });
                if (data.ok) {
                  navigate('/menu');
                } else {
                  setShowAuthError(true);
                }
              } catch {
                setShowAuthError(true);
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            <p className="login01__buttonText" data-node-id="834:38379">로그인하기</p>
          </button>

          {showIdEmptyModal && (
            <>
              <div className="login01__modalBackdrop" onClick={() => setShowIdEmptyModal(false)} aria-hidden />
              <div className="login01__modal" data-node-id="834-38448">
                <p className="login01__modalMessage">아이디를 입력해주세요</p>
                <div className="login01__modalDivider" />
                <button type="button" className="login01__modalConfirm" onClick={() => setShowIdEmptyModal(false)}>확인</button>
              </div>
            </>
          )}

          {showPasswordEmptyModal && (
            <>
              <div className="login01__modalBackdrop" onClick={() => setShowPasswordEmptyModal(false)} aria-hidden />
              <div className="login01__modal">
                <p className="login01__modalMessage">비밀번호를 입력해주세요</p>
                <div className="login01__modalDivider" />
                <button type="button" className="login01__modalConfirm" onClick={() => setShowPasswordEmptyModal(false)}>확인</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
