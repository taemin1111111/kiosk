import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getBoCategories, getBoOptionGroups, getBoNutritionCategories, getBoMenuDetail, postBoMenus, patchBoMenu, uploadBoMenuImage } from '../../api';

function newRowId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function AdminMenuRegister() {
  const params = useParams();
  const editMenuId = params?.id ? Number(params.id) : null;
  const isEdit = Boolean(editMenuId);
  const [categories, setCategories] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);
  const [nutritionCategories, setNutritionCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitStatus, setSubmitStatus] = useState({ ok: null, message: '' });
  const [emptyModalOpen, setEmptyModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [productNameEn, setProductNameEn] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadErr, setImageUploadErr] = useState('');
  const [imageMeta, setImageMeta] = useState(null); // { name: string, width: number, height: number }
  const imageFileRef = useRef(null);
  const [nutritionInputs, setNutritionInputs] = useState([{ id: newRowId(), category_id: '', value: '' }]);
  const [nutritions, setNutritions] = useState([]); // [{ category_id, value }]
  const [selectedOptionGroupIds, setSelectedOptionGroupIds] = useState([]);
  const [optionGroupToAdd, setOptionGroupToAdd] = useState('');

  const isFormFullyFilled = Boolean(
    String(categoryId).trim() &&
      productName.trim() &&
      productNameEn.trim() &&
      String(price).trim() !== '' &&
      Number(price) > 0 &&
      description.trim() &&
      ingredients.trim() &&
      Boolean(imageUrls?.[0]) &&
      (nutritions?.length || 0) > 0 &&
      (selectedOptionGroupIds?.length || 0) > 0
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [catRes, optRes, nutRes] = await Promise.all([getBoCategories(), getBoOptionGroups(), getBoNutritionCategories()]);
      if (!cancelled) {
        if (catRes.ok) setCategories(catRes.data || []);
        if (optRes.ok) setOptionGroups(optRes.data || []);
        if (nutRes.ok) setNutritionCategories(nutRes.data || []);
        // edit 모드면 기존 메뉴 데이터 로드해서 프리필
        if (isEdit && editMenuId) {
          const d = await getBoMenuDetail(editMenuId);
          if (d?.ok && d.data) {
            const m = d.data;
            setCategoryId(String(m.category_id ?? ''));
            setProductName(m.name_ko ?? '');
            setProductNameEn(m.name_en ?? '');
            setPrice(String(m.base_price ?? ''));
            setDescription(m.description ?? '');
            setIngredients(m.ingredients ?? '');

            const urls = (m.images || []).map((x) => x.image_url).filter(Boolean);
            setImageUrls(urls.length ? [urls[0]] : []);
            setImageUploadErr('');
            setImageMeta(null);

            const ns = (m.nutritions || []).map((x) => ({ category_id: Number(x.category_id), value: String(x.value ?? '') }));
            setNutritions(ns);
            setNutritionInputs([{ id: newRowId(), category_id: '', value: '' }]);

            const ogIds = (m.option_groups || []).map((x) => Number(x.group_id)).filter(Boolean);
            setSelectedOptionGroupIds(ogIds);
          }
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, editMenuId]);

  const addOptionGroup = () => {
    const id = Number(optionGroupToAdd);
    if (id && !selectedOptionGroupIds.includes(id)) {
      setSelectedOptionGroupIds((prev) => [...prev, id]);
      setOptionGroupToAdd('');
    }
  };

  const removeOptionGroup = (id) => {
    setSelectedOptionGroupIds((prev) => prev.filter((x) => x !== id));
  };

  const addNutritionInputRow = () => {
    setNutritionInputs((prev) => [...prev, { id: newRowId(), category_id: '', value: '' }]);
  };

  const removeNutritionInputRow = (id) => {
    setNutritionInputs((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [{ id: newRowId(), category_id: '', value: '' }];
    });
  };

  const updateNutritionInput = (id, patch) => {
    setNutritionInputs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const commitNutritionRow = (row) => {
    const categoryId = Number(row.category_id);
    const value = String(row.value || '').trim();
    if (!categoryId || !value) return;
    setNutritions((prev) => {
      const next = prev.filter((x) => Number(x.category_id) !== categoryId);
      next.push({ category_id: categoryId, value });
      return next;
    });
    // 입력 완료 후 해당 row는 초기화
    updateNutritionInput(row.id, { category_id: '', value: '' });
  };

  const removeNutrition = (categoryId) => {
    setNutritions((prev) => prev.filter((x) => Number(x.category_id) !== Number(categoryId)));
  };

  const pickImageFile = () => imageFileRef.current?.click();

  const removeImage = () => {
    setImageUrls([]);
    setImageMeta(null);
    setImageUploadErr('');
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageUploadErr('');
    if (!file.type?.startsWith('image/')) {
      setImageUploadErr('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setImageUploadErr('이미지 파일은 25MB 이하만 업로드할 수 있습니다.');
      return;
    }

    try {
      setImageUploading(true);
      // 파일 메타(가로/세로) 측정
      const objectUrl = URL.createObjectURL(file);
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = objectUrl;
      }).finally(() => URL.revokeObjectURL(objectUrl));
      setImageMeta({ name: file.name, width: dims.width, height: dims.height });

      const result = await uploadBoMenuImage(file);
      if (result?.ok && result.data?.image_url) {
        setImageUrls([result.data.image_url]);
      } else {
        setImageUploadErr(result?.message || '이미지 업로드에 실패했습니다.');
        setImageMeta(null);
      }
    } catch (err) {
      setImageUploadErr(err?.message || '이미지 업로드 중 오류가 발생했습니다.');
      setImageMeta(null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ ok: null, message: '' });
    if (!categoryId) {
      setCategoryError(true);
      return;
    }
    setCategoryError(false);
    if (!productName.trim()) {
      setEmptyModalOpen(true);
      return;
    }
    if (String(price).trim() === '') {
      setEmptyModalOpen(true);
      return;
    }
    const payload = {
      category_id: Number(categoryId),
      name_ko: productName.trim(),
      name_en: productNameEn.trim() || undefined,
      base_price: Number(price) || 0,
      description: description.trim() || undefined,
      ingredients: ingredients.trim() || undefined,
      images: imageUrls.map((url, i) => ({ image_url: url, is_main: i === 0 ? 1 : 0, sort_order: i })),
      nutritions,
      option_group_ids: selectedOptionGroupIds,
    };
    const result = isEdit && editMenuId ? await patchBoMenu(editMenuId, payload) : await postBoMenus(payload);
    // 등록 성공 시: Figma 성공 모달 노출
    if (result.ok && !isEdit) {
      setSubmitStatus({ ok: null, message: '' });
      setSuccessModalOpen(true);
      setCategoryId('');
      setProductName('');
      setProductNameEn('');
      setPrice('');
      setDescription('');
      setIngredients('');
      setImageUrls([]);
      setImageUploadErr('');
      setImageMeta(null);
      setNutritions([]);
      setNutritionInputs([{ id: newRowId(), category_id: '', value: '' }]);
      setSelectedOptionGroupIds([]);
      return;
    }
    setSubmitStatus({ ok: result.ok, message: result.message || (result.ok ? (isEdit ? '수정되었습니다.' : '등록되었습니다.') : (isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.')) });
  };

  if (loading) {
    return (
      <div className="admin-menu-register">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="admin-menu-register">
      <form onSubmit={handleSubmit} noValidate>
        <div className="admin-menu-register__head">
          <div>
            <p className="admin-menu-register__breadcrumb">메뉴관리</p>
            <h1 className="admin-menu-register__title">{isEdit ? '메뉴 수정하기' : '메뉴 등록하기'}</h1>
          </div>
          <button
            type="submit"
            className={`admin-menu-register__submitBtn ${isFormFullyFilled ? 'admin-menu-register__submitBtn--active' : 'admin-menu-register__submitBtn--disabled'}`}
            disabled={!isFormFullyFilled}
            aria-disabled={!isFormFullyFilled}
          >
            {isEdit ? '메뉴 수정하기' : '메뉴 등록하기'}
          </button>
        </div>
        <div className="admin-menu-register__belowTitle">
          {submitStatus.message && (
            <p className={submitStatus.ok ? 'admin-menu-register__msg admin-menu-register__msg--ok' : 'admin-menu-register__msg admin-menu-register__msg--err'}>
              {submitStatus.message}
            </p>
          )}

          <div className="admin-menu-register__form">
            <div className="admin-menu-register__colLeft">
              <section className="admin-menu-register__field">
                <div className="admin-menu-register__labelRow">
                  <label className="admin-menu-register__label">카테고리</label>
                  {categoryError && <span className="admin-menu-register__fieldErr">카테고리를 선택해 주세요</span>}
                </div>
                <select
                  className={`admin-menu-register__select ${categoryError ? 'admin-menu-register__select--err' : ''}`}
                  aria-label="카테고리 선택"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (e.target.value) setCategoryError(false);
                  }}
                >
                  <option value="">카테고리를 선택해 주세요.</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ko}
                    </option>
                  ))}
                </select>
              </section>
              <section className="admin-menu-register__field">
                <label className="admin-menu-register__label">상품명</label>
                <div className="admin-menu-register__inputWrap">
                  <input
                    type="text"
                    className="admin-menu-register__input"
                    placeholder="상품명을 입력해주세요."
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    maxLength={30}
                  />
                  <div className="admin-menu-register__counterWrap" aria-label="글자 수">
                    <span className="admin-menu-register__counterNow">{productName.length}</span>
                    <span className="admin-menu-register__counterSep">/</span>
                    <span className="admin-menu-register__counterMax">30</span>
                    <span className="admin-menu-register__counterBadge">A</span>
                  </div>
                </div>
              </section>
              <section className="admin-menu-register__field">
                <label className="admin-menu-register__label">상품명(영문)</label>
                <div className="admin-menu-register__inputWrap">
                  <input
                    type="text"
                    className="admin-menu-register__input"
                    placeholder="상품명(영문)을 입력해주세요."
                    value={productNameEn}
                    onChange={(e) => setProductNameEn(e.target.value)}
                    maxLength={30}
                  />
                  <div className="admin-menu-register__counterWrap" aria-label="글자 수">
                    <span className="admin-menu-register__counterNow">{productNameEn.length}</span>
                    <span className="admin-menu-register__counterSep">/</span>
                    <span className="admin-menu-register__counterMax">30</span>
                    <span className="admin-menu-register__counterBadge">A</span>
                  </div>
                </div>
              </section>
              <section className="admin-menu-register__field">
                <label className="admin-menu-register__label">상품가격</label>
                <div className="admin-menu-register__priceWrap">
                  <input
                    type="number"
                    className="admin-menu-register__input"
                    placeholder="상품 가격을 입력해주세요."
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min={0}
                  />
                  <span className="admin-menu-register__unit">원</span>
                </div>
              </section>
              <section className="admin-menu-register__field">
                <label className="admin-menu-register__label">상품내용</label>
                <textarea
                  className="admin-menu-register__textarea"
                  placeholder="상품 상세설명을 입력해주세요."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </section>
              <section className="admin-menu-register__field">
                <label className="admin-menu-register__label">원재료명 및 함량</label>
                <textarea
                  className="admin-menu-register__textarea"
                  placeholder="원재료명 및 함량을 입력해주세요."
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows={4}
                />
              </section>
            </div>

            <div className="admin-menu-register__colRight">
              <section className="admin-menu-register__field">
                <label className="admin-menu-register__label">상품사진</label>
                <div className="admin-menu-register__upload">
                  <div className="admin-menu-register__uploadHeader">
                    <span className="admin-menu-register__uploadText">이미지 업로드 *규격 25mb 이하 png, jpg 권장사이즈: 800×600px</span>
                    <button type="button" className="admin-menu-register__uploadBtn" onClick={pickImageFile} aria-label="이미지 추가">
                      +
                    </button>
                    <input
                      ref={imageFileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      className="admin-menu-register__fileInput"
                      onChange={handleImageFileChange}
                    />
                  </div>

                  <div className="admin-menu-register__uploadBody" onClick={pickImageFile} role="button" tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && pickImageFile()}>
                    {imageUploading ? (
                      <div className="admin-menu-register__uploadEmpty">
                        <span className="admin-menu-register__uploadHint">업로드 중...</span>
                      </div>
                    ) : imageUrls[0] ? (
                      <div className="admin-menu-register__uploadPreviewRow">
                        <div className="admin-menu-register__uploadPreviewBox">
                          <img className="admin-menu-register__uploadPreview" src={imageUrls[0]} alt="업로드된 상품 이미지" />
                        </div>
                        <div className="admin-menu-register__uploadMeta">
                          <div className="admin-menu-register__uploadMetaText">
                            <p className="admin-menu-register__uploadFileName">{imageMeta?.name || 'image'}</p>
                            {imageMeta?.width && imageMeta?.height ? (
                              <p className="admin-menu-register__uploadFileDim">
                                {imageMeta.width}*{imageMeta.height}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="admin-menu-register__uploadRemove"
                            aria-label="이미지 삭제"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              removeImage();
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="admin-menu-register__uploadEmpty" />
                    )}
                  </div>
                  {imageUploadErr && <p className="admin-menu-register__msg admin-menu-register__msg--err">{imageUploadErr}</p>}
                </div>
              </section>
              <section className="admin-menu-register__field">
                <div className="admin-menu-register__nutritionHeader">
                  <span className="admin-menu-register__nutritionTitle">영양정보</span>
                  <button
                    type="button"
                    className="admin-menu-register__nutritionToggle"
                    aria-label="영양정보 입력줄 추가"
                    onClick={addNutritionInputRow}
                  >
                    +
                  </button>
                </div>

                <div className="admin-menu-register__nutritionBox">
                  <div className="admin-menu-register__nutritionCols">
                    <span>카테고리</span>
                    <span>내용</span>
                    <span />
                    <span />
                  </div>

                  {nutritionInputs.map((row) => (
                    <div key={row.id} className="admin-menu-register__nutritionRow">
                      <select
                        className="admin-menu-register__select"
                        value={row.category_id}
                        onChange={(e) => updateNutritionInput(row.id, { category_id: e.target.value })}
                        aria-label="영양정보 카테고리"
                      >
                        <option value="">카테고리 선택</option>
                        {nutritionCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name_ko} ({c.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        className="admin-menu-register__input"
                        placeholder="값을 입력"
                        value={row.value}
                        onChange={(e) => updateNutritionInput(row.id, { value: e.target.value })}
                      />

                      <button type="button" className="admin-menu-register__nutritionAddBtn" onClick={() => commitNutritionRow(row)}>
                        입력
                      </button>

                      <button
                        type="button"
                        className="admin-menu-register__nutritionRemoveBtn"
                        aria-label="입력줄 삭제"
                        onClick={() => removeNutritionInputRow(row.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {nutritions.length > 0 && (
                    <ul className="admin-menu-register__nutritionList">
                      {nutritions
                        .slice()
                        .sort((a, b) => {
                          const aa = nutritionCategories.find((x) => Number(x.id) === Number(a.category_id));
                          const bb = nutritionCategories.find((x) => Number(x.id) === Number(b.category_id));
                          return (aa?.sort_order ?? 9999) - (bb?.sort_order ?? 9999);
                        })
                        .map((n) => {
                          const c = nutritionCategories.find((x) => Number(x.id) === Number(n.category_id));
                          return (
                            <li key={n.category_id}>
                              <span className="admin-menu-register__nutritionItemName">{c ? `${c.name_ko} (${c.unit})` : n.category_id}</span>
                              <span className="admin-menu-register__nutritionItemValue">{n.value}</span>
                              <button type="button" className="admin-menu-register__iconBtn" onClick={() => removeNutrition(n.category_id)} aria-label="삭제">
                                삭제
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              </section>
              <section className="admin-menu-register__field">
                <div className="admin-menu-register__labelRow">
                  <label className="admin-menu-register__label">옵션 (menu_option_groups)</label>
                </div>
                <div className="admin-menu-register__row">
                  <select
                    className="admin-menu-register__select"
                    value={optionGroupToAdd}
                    onChange={(e) => setOptionGroupToAdd(e.target.value)}
                    aria-label="옵션 그룹 선택"
                  >
                    <option value="">옵션 그룹 선택</option>
                    {optionGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name_ko}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="admin-menu-register__inputBtn" onClick={addOptionGroup}>
                    추가
                  </button>
                </div>
                <ul className="admin-menu-register__optionList">
                  {selectedOptionGroupIds.map((id) => {
                    const g = optionGroups.find((x) => x.id === id);
                    return (
                      <li key={id}>
                        {g?.name_ko ?? id}
                        <button type="button" className="admin-menu-register__iconBtn" onClick={() => removeOptionGroup(id)} aria-label="제거">
                          삭제
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </form>

      {emptyModalOpen && (
        <>
          <div className="admin-menu-register__modalBackdrop" onClick={() => setEmptyModalOpen(false)} aria-hidden />
          <div className="admin-menu-register__modal" role="dialog" aria-modal="true" aria-label="입력 오류">
            <p className="admin-menu-register__modalMessage">내용을 입력해주세요</p>
            <div className="admin-menu-register__modalDivider" />
            <button type="button" className="admin-menu-register__modalConfirm" onClick={() => setEmptyModalOpen(false)}>
              확인
            </button>
          </div>
        </>
      )}

      {successModalOpen && (
        <>
          <div className="admin-menu-register__modalBackdrop" onClick={() => setSuccessModalOpen(false)} aria-hidden />
          <div className="admin-menu-register__modal" role="dialog" aria-modal="true" aria-label="등록 완료">
            <p className="admin-menu-register__modalMessage">메뉴가 등록되었습니다.</p>
            <div className="admin-menu-register__modalDivider" />
            <button type="button" className="admin-menu-register__modalConfirm" onClick={() => setSuccessModalOpen(false)}>
              확인
            </button>
          </div>
        </>
      )}
    </div>
  );
}
