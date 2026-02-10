import { useEffect, useMemo, useState } from 'react';
import { getBoPrivacyPolicy, postBoPrivacyPolicy } from '../../api';

function formatKoreanDate(dateLike) {
  if (!dateLike) return null;
  if (typeof dateLike === 'string') {
    // MySQL DATE: "YYYY-MM-DD"
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateLike);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (y && mo && d) return `${y}년 ${mo}월 ${d}일`;
    }
  }
  try {
    const dt = new Date(dateLike);
    if (Number.isNaN(dt.getTime())) return null;
    return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  } catch {
    return null;
  }
}

export default function AdminPrivacyPolicy() {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getBoPrivacyPolicy().catch(() => ({ ok: false }));
      if (!cancelled) {
        const next = res?.ok ? res.data : null;
        setPolicy(next);
        const nextContent = String(next?.content ?? '').trim();
        setDraft(nextContent);
        setEditing(!nextContent); // 비어있으면 입력 화면
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const contentText = String(policy?.content ?? '').trim();
  const updatedAtText = useMemo(() => formatKoreanDate(policy?.updated_at), [policy?.updated_at]);
  const hasSavedPolicy = Boolean(contentText) && Boolean(updatedAtText);
  const canSubmit = draft.trim().length > 0 && !saving;

  const onClickUpdate = async () => {
    if (loading) return;
    if (!editing) {
      setDraft(contentText);
      setEditing(true);
      return;
    }
    if (!canSubmit) return;
    setSaving(true);
    const res = await postBoPrivacyPolicy(draft).catch(() => ({ ok: false }));
    if (res?.ok) {
      setPolicy(res.data || null);
      setEditing(false);
      setSuccessModalOpen(true);
    }
    setSaving(false);
  };

  return (
    <div className="admin-terms">
      <div className="admin-terms__head">
        <div className="admin-terms__headLeft">
          <p className="admin-dashboard__breadcrumb">약관관리</p>
          <h1 className="admin-dashboard__title">개인정보 처리방침</h1>
        </div>
        <button type="button" className="admin-terms__updateBtn" disabled={editing && !canSubmit} onClick={onClickUpdate}>
          업데이트 하기
        </button>
      </div>

      <div className="admin-terms__body">
        {hasSavedPolicy && (
          <p className="admin-terms__updatedLine">
            마지막으로 업데이트한 일자는 <span className="admin-terms__updatedDate">{updatedAtText}</span> 입니다.
          </p>
        )}

        <div className="admin-terms__box" role="region" aria-label="개인정보 처리방침 본문">
          {loading ? (
            <p className="admin-terms__loading">로딩 중...</p>
          ) : editing ? (
            <textarea
              className="admin-terms__editor"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="내용을 입력해 주세요"
            />
          ) : contentText ? (
            <div className="admin-terms__content">{contentText}</div>
          ) : (
            <textarea className="admin-terms__editor" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="내용을 입력해 주세요" />
          )}
        </div>
      </div>

      {successModalOpen && (
        <>
          <div className="admin-terms__modalBackdrop" onClick={() => setSuccessModalOpen(false)} aria-hidden />
          <div className="admin-terms__modal" role="dialog" aria-modal="true" aria-label="업데이트 완료">
            <p className="admin-terms__modalMessage">개인정보 처리방침이 업데이트 되었습니다.</p>
            <div className="admin-terms__modalDivider" />
            <button type="button" className="admin-terms__modalConfirm" onClick={() => setSuccessModalOpen(false)}>
              확인
            </button>
          </div>
        </>
      )}
    </div>
  );
}

