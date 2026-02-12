import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { computeScale } from '../../utils/figmaScale';
import { getAppMe, patchAppMe } from '../../api';
import backSvg from '../../assets/arrow_back_ios_new.svg';

export default function MobileAccountDetail() {
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadMe = async () => {
    const res = await getAppMe().catch(() => ({ ok: false }));
    if (!res?.ok) {
      setError('계정 정보를 불러오지 못했습니다.');
      setUsername('');
      setName('');
      setEmail('');
      setEditName('');
      return;
    }
    setUsername(res.data?.username ?? '');
    setName(res.data?.name ?? '');
    setEmail(res.data?.email ?? '');
    setEditName(res.data?.name ?? '');
    setError('');
  };

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
      await loadMe();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveName = async () => {
    const newName = (editName || '').trim();
    if (!newName) {
      alert('이름을 입력해주세요.');
      return;
    }
    if (newName === name) return;
    setSaving(true);
    const res = await patchAppMe({ name: newName }).catch(() => ({ ok: false }));
    setSaving(false);
    if (res?.ok) {
      setName(newName);
      setSuccessModalOpen(true);
    } else {
      alert(res?.message || '이름 변경에 실패했습니다.');
    }
  };

  return (
    <div className="figma360-stage figma360-stage--termsDetail" data-node-id="836-120413">
      <div className="figma360-scale figma360-scale--termsDetail" style={{ '--figma360-scale': String(scale) }}>
        <div className="termsDetail termsDetail--account">
          <div className="termsDetail__topBar">
            <button type="button" className="termsDetail__back" aria-label="뒤로" onClick={() => navigate(-1)}>
              <img src={backSvg} alt="" aria-hidden />
            </button>
          </div>

          <div className="termsDetail__titleBar">
            <p className="termsDetail__title">계정정보</p>
          </div>

          <div className="termsDetail__box" role="region" aria-label="계정정보">
            <div className="termsDetail__boxInner">
              {loading ? (
                <p className="termsDetail__text">불러오는 중...</p>
              ) : error ? (
                <p className="termsDetail__text">{error}</p>
              ) : (
                <div className="accountDetail">
                  <div className="accountDetail__row">
                    <span className="accountDetail__label">아이디</span>
                    <span className="accountDetail__value">{username}</span>
                  </div>
                  <div className="accountDetail__row accountDetail__row--editable">
                    <span className="accountDetail__label">이름</span>
                    <div className="accountDetail__nameWrap">
                      <input
                        type="text"
                        className="accountDetail__input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="이름"
                        maxLength={50}
                        aria-label="이름"
                      />
                      <button
                        type="button"
                        className="accountDetail__btn"
                        onClick={handleSaveName}
                        disabled={saving || (editName || '').trim() === name}
                      >
                        {saving ? '저장 중...' : '변경'}
                      </button>
                    </div>
                  </div>
                  <div className="accountDetail__row">
                    <span className="accountDetail__label">이메일</span>
                    <span className="accountDetail__value">{email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {successModalOpen && (
        <div
          className="menu__emptyModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accountDetail__successModalTitle"
          onClick={() => setSuccessModalOpen(false)}
        >
          <div className="menu__emptyModal" onClick={(e) => e.stopPropagation()}>
            <p id="accountDetail__successModalTitle" className="menu__emptyModalMessage">
              이름이 변경되었습니다.
            </p>
            <div className="menu__emptyModalLine" aria-hidden="true" />
            <button
              type="button"
              className="menu__emptyModalBtn"
              onClick={() => setSuccessModalOpen(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
