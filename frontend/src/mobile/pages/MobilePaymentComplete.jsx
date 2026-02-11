import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';

export default function MobilePaymentComplete() {
  const [scale, setScale] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="figma360-stage figma360-stage--order-complete" data-node-id="836-121582">
      <div className="figma360-scale figma360-scale--order-complete" style={{ '--figma360-scale': String(scale) }}>
        <div className="order-complete">
          <header className="order-complete__header">
            <button
              type="button"
              className="order-complete__close"
              aria-label="닫기"
              onClick={() => navigate('/menu')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <p className="order-complete__message">결제가 완료되었습니다!</p>

          <footer className="order-complete__footer">
            <button
              type="button"
              className="order-complete__link"
              onClick={() => navigate('/menu')}
            >
              주문 추가하기
            </button>
            <button
              type="button"
              className="order-complete__btn"
              onClick={() => navigate('/menu/order-history')}
            >
              주문내역 보기
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
