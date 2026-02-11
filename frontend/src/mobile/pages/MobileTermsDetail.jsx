import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppPrivacyPolicy, getAppServiceTerms } from '../../api';
import backSvg from '../../assets/arrow_back_ios_new.svg';

const TITLES = {
  service: '서비스 이용약관',
  privacy: '개인정보 처리방침',
};

export default function MobileTermsDetail() {
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { type } = useParams();
  const title = TITLES[type] || '약관';

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
      try {
        const res =
          type === 'privacy'
            ? await getAppPrivacyPolicy().catch(() => ({ ok: false }))
            : await getAppServiceTerms().catch(() => ({ ok: false }));

        if (cancelled) return;
        if (!res?.ok) {
          setError('약관을 불러오지 못했습니다.');
          setContent('');
          return;
        }
        setContent(String(res.data?.content || ''));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type]);

  return (
    <div className="figma360-stage figma360-stage--termsDetail" data-node-id="836-120413">
      <div className="figma360-scale figma360-scale--termsDetail" style={{ '--figma360-scale': String(scale) }}>
        <div className="termsDetail">
          <div className="termsDetail__topBar">
            <button type="button" className="termsDetail__back" aria-label="뒤로" onClick={() => navigate(-1)}>
              <img src={backSvg} alt="" aria-hidden />
            </button>
          </div>

          <div className="termsDetail__titleBar">
            <p className="termsDetail__title">{title}</p>
          </div>

          <div className="termsDetail__box" role="region" aria-label={title}>
            <div className="termsDetail__boxInner">
              {loading ? (
                <p className="termsDetail__text">불러오는 중...</p>
              ) : error ? (
                <p className="termsDetail__text">{error}</p>
              ) : (
                <p className="termsDetail__text">{content}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
