import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';

import logoSvg from '../../assets/Vector.svg';
import arrowBackSvg from '../../assets/arrow_back_ios_new.svg';

/** Figma 1152-6377: 회원가입 완료 화면 (모달 없이 이 화면으로 바로 이동) */
export default function MobileSignupComplete() {
  const [scale, setScale] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  const name = location.state?.name?.trim() || '회원';

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="figma360-stage" data-node-id="1152-6377">
      <div className="figma360-scale figma360-scale--signup" style={{ '--figma360-scale': String(scale) }}>
        <div className="signup-complete">
          <header className="signup__header">
            <button type="button" className="signup__back" onClick={() => navigate('/', { replace: true })} aria-label="뒤로">
              <img src={arrowBackSvg} alt="" />
            </button>
            <img className="signup__logo" src={logoSvg} alt="FELN" />
          </header>

          <div className="signup-complete__titleBox" aria-hidden />
          <p className="signup-complete__greeting signup-complete__greeting--line1">안녕하세요</p>
          <p className="signup-complete__greeting signup-complete__greeting--line2">{name}님!</p>
          <p className="signup-complete__desc">회원가입이 완료되었습니다.</p>

          <button
            type="button"
            className="signup-complete__button signup-complete__button--active"
            onClick={() => navigate('/', { replace: true })}
          >
            로그인하기
          </button>
        </div>
      </div>
    </div>
  );
}
