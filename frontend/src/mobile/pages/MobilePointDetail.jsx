import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppActiveCart } from '../../api';
import backSvg from '../../assets/arrow_back_ios_new.svg';
import storePointSvg from '../../assets/store_point.svg';
import tossPng from '../../assets/toss.png';

export default function MobilePointDetail() {
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [storePoint, setStorePoint] = useState(0);
  const [tossPoint, setTossPoint] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => setScale(computeScale());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const res = await getAppActiveCart().catch(() => ({ ok: false }));
      if (cancelled) return;
      if (!res?.ok) {
        setError('포인트를 불러오지 못했습니다.');
        setStorePoint(0);
        setTossPoint(0);
      } else {
        setStorePoint(Number(res.data?.store_point_balance) || 0);
        setTossPoint(Number(res.data?.toss_point_balance) || 0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="figma360-stage figma360-stage--termsDetail" data-node-id="836-120413">
      <div className="figma360-scale figma360-scale--termsDetail" style={{ '--figma360-scale': String(scale) }}>
        <div className="termsDetail termsDetail--point">
          <div className="termsDetail__topBar">
            <button type="button" className="termsDetail__back" aria-label="뒤로" onClick={() => navigate(-1)}>
              <img src={backSvg} alt="" aria-hidden />
            </button>
          </div>

          <div className="termsDetail__titleBar">
            <p className="termsDetail__title">포인트</p>
          </div>

          <div className="termsDetail__box" role="region" aria-label="포인트">
            <div className="termsDetail__boxInner">
              {loading ? (
                <p className="termsDetail__text">불러오는 중...</p>
              ) : error ? (
                <p className="termsDetail__text">{error}</p>
              ) : (
                <div className="pointDetail">
                  <div className="pointDetail__row">
                    <img src={storePointSvg} alt="" className="pointDetail__icon" aria-hidden />
                    <span className="pointDetail__label">가게 포인트</span>
                    <span className="pointDetail__amount">{storePoint.toLocaleString('ko-KR')} P</span>
                  </div>
                  <div className="pointDetail__row">
                    <img src={tossPng} alt="" className="pointDetail__icon" aria-hidden />
                    <span className="pointDetail__label">토스 포인트</span>
                    <span className="pointDetail__amount">{tossPoint.toLocaleString('ko-KR')} P</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
