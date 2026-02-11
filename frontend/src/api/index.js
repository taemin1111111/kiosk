/**
 * 공통 API - 모바일/백오피스 모두 사용
 * 로그인 JWT: localStorage에 저장, 인증 필요 API 호출 시 Authorization 헤더에 포함
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** 404 HTML 등 비정상 응답 시 JSON 파싱 에러 방지 */
async function parseResJson(res) {
  const text = await res.text();
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new Error(res.ok ? 'Invalid response type' : `서버 오류 (${res.status}). 백엔드가 실행 중인지 확인하세요.`);
  }
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('서버 응답을 읽을 수 없습니다. 백엔드가 실행 중인지 확인하세요.');
  }
}

const AUTH_TOKEN_KEY = 'kiosk_token';

export function getStoredToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}

export function clearStoredToken() {
  setStoredToken(null);
}

/** 인증 헤더 (Bearer 토큰). 모바일 웹/앱 동일하게 사용 */
export function getAuthHeaders() {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** FormData 업로드용 인증 헤더 (Content-Type 설정 금지) */
function getAuthOnlyHeaders() {
  const token = getStoredToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

/**
 * 회원가입
 * @param {{ name: string, username: string, email: string, password: string }} data
 * @returns {{ ok: boolean, message?: string, memberId?: number }}
 */
export async function signup(data) {
  const res = await fetch(`${API_BASE}/members/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * 아이디 찾기 (성함 + 메일 주소)
 * @param {{ name: string, email: string }} data
 * @returns {{ ok: boolean, message?: string, username?: string }}
 */
export async function findId(data) {
  const res = await fetch(`${API_BASE}/members/find-id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * 로그인 (아이디·비밀번호 DB 비교)
 * @param {{ username: string, password: string }} data
 * @returns {{ ok: boolean, message?: string }}
 */
/**
 * 로그인 (아이디·비밀번호 DB 비교). 성공 시 JWT 반환, 프론트에서 저장
 * @param {{ username: string, password: string }} data
 * @returns {{ ok: boolean, message?: string, token?: string }}
 */
export async function login(data) {
  try {
    const res = await fetch(`${API_BASE}/members/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({ ok: false }));
    if (result.ok && result.token) {
      setStoredToken(result.token);
    }
    return result;
  } catch {
    return { ok: false };
  }
}

// ========== 사용자(키오스크) 홈 ==========

/** GET /app/categories - 사용자 메뉴 카테고리 탭 */
export async function getAppCategories() {
  const res = await fetch(`${API_BASE}/app/categories`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /app/menus - 사용자 홈(상품 리스트) */
export async function getAppMenus(params = {}) {
  const qs = new URLSearchParams();
  if (params.category_id) qs.set('category_id', String(params.category_id));
  const url = `${API_BASE}/app/menus${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /app/menus/:id - 사용자 메뉴 상세(옵션 포함) */
export async function getAppMenuDetail(menuId) {
  const res = await fetch(`${API_BASE}/app/menus/${menuId}`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /app/service-terms - 서비스 이용약관 (최신 1건) */
export async function getAppServiceTerms() {
  const res = await fetch(`${API_BASE}/app/service-terms`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /app/privacy-policy - 개인정보 처리방침 (최신 1건) */
export async function getAppPrivacyPolicy() {
  const res = await fetch(`${API_BASE}/app/privacy-policy`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /app/carts/active - ACTIVE 장바구니 조회 */
export async function getAppActiveCart() {
  const res = await fetch(`${API_BASE}/app/carts/active`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/**
 * POST /app/carts/active/items - 장바구니 담기
 * payload: { menu_id:number, qty:number, options:[{group_id,item_id,option_qty?}] }
 */
export async function postAppCartItem(payload) {
  const res = await fetch(`${API_BASE}/app/carts/active/items`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResJson(res);
}

/** DELETE /app/carts/active/items - 장바구니 초기화 */
export async function deleteAppClearCart() {
  const res = await fetch(`${API_BASE}/app/carts/active/items`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseResJson(res);
}

/** PATCH /app/carts/active/items/:id - 장바구니 아이템 수량 변경 */
export async function patchAppCartItemQty(cartItemId, qty) {
  const res = await fetch(`${API_BASE}/app/carts/active/items/${Number(cartItemId)}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ qty }),
  });
  return parseResJson(res);
}

/** DELETE /app/carts/active/items/:id - 장바구니 아이템 삭제 */
export async function deleteAppCartItem(cartItemId) {
  const res = await fetch(`${API_BASE}/app/carts/active/items/${Number(cartItemId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseResJson(res);
}

/**
 * POST /app/checkout - 결제하기
 * payload: { method:'card'|'simple'|'cash'|'transfer', store_point_used: number, toss_point_used: number, eat_type: 'in'|'takeout' }
 */
export async function postAppCheckout(payload) {
  const res = await fetch(`${API_BASE}/app/checkout`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResJson(res);
}

/** GET /app/orders - 주문내역 */
/**
 * GET /app/orders - 내 주문내역
 * @param {{ status?: string, dateFrom?: string, dateTo?: string }} params - 선택: status(ALL/PAID/...), dateFrom/dateTo (YYYY-MM-DD)
 */
export async function getAppOrders(params = {}) {
  const q = new URLSearchParams();
  if (params.status != null && params.status !== '') q.set('status', params.status);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  const query = q.toString();
  const url = query ? `${API_BASE}/app/orders?${query}` : `${API_BASE}/app/orders`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return parseResJson(res);
}

// ========== BO(관리자) 메뉴 등록 ==========

/** GET /bo/categories - 카테고리 드롭다운 (menus.category_id) */
export async function getBoCategories() {
  const res = await fetch(`${API_BASE}/bo/categories`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /bo/option-groups - 옵션 그룹 드롭다운 (menu_option_groups.group_id) */
export async function getBoOptionGroups() {
  const res = await fetch(`${API_BASE}/bo/option-groups`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /bo/option-groups/:id/items - 옵션 항목 목록 */
export async function getBoOptionItems(groupId) {
  const res = await fetch(`${API_BASE}/bo/option-groups/${groupId}/items`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /bo/nutrition-categories - 영양정보 카테고리 드롭다운 (menu_nutritions.category_id) */
export async function getBoNutritionCategories() {
  const res = await fetch(`${API_BASE}/bo/nutrition-categories`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /bo/menus - 메뉴 리스트 */
export async function getBoMenus(params = {}) {
  const qs = new URLSearchParams();
  if (params.category_id) qs.set('category_id', String(params.category_id));
  const url = `${API_BASE}/bo/menus${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /bo/menus/:id - 메뉴 상세 */
export async function getBoMenuDetail(menuId) {
  const res = await fetch(`${API_BASE}/bo/menus/${menuId}`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /bo/users - 유저 리스트 (role=USER) */
export async function getBoUsers() {
  const res = await fetch(`${API_BASE}/bo/users`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** GET /bo/service-terms - 서비스 이용약관 (최신 1건) */
export async function getBoServiceTerms() {
  const res = await fetch(`${API_BASE}/bo/service-terms`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** POST /bo/service-terms - 서비스 이용약관 저장(새 버전 추가) */
export async function postBoServiceTerms(content) {
  const res = await fetch(`${API_BASE}/bo/service-terms`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  return parseResJson(res);
}

/** GET /bo/privacy-policy - 개인정보 처리방침 (최신 1건) */
export async function getBoPrivacyPolicy() {
  const res = await fetch(`${API_BASE}/bo/privacy-policy`, { headers: getAuthHeaders() });
  return parseResJson(res);
}

/** POST /bo/privacy-policy - 개인정보 처리방침 저장(새 버전 추가) */
export async function postBoPrivacyPolicy(content) {
  const res = await fetch(`${API_BASE}/bo/privacy-policy`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  return parseResJson(res);
}

/** PATCH /bo/menus/:id/best - 베스트 메뉴 지정/해제 */
export async function patchBoMenuBest(menuId, is_best) {
  const res = await fetch(`${API_BASE}/bo/menus/${menuId}/best`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ is_best: is_best ? 1 : 0 }),
  });
  return parseResJson(res);
}

/** PATCH /bo/menus/:id/option-groups - 메뉴 옵션 그룹 교체 */
export async function patchBoMenuOptionGroups(menuId, option_group_ids) {
  const res = await fetch(`${API_BASE}/bo/menus/${menuId}/option-groups`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ option_group_ids }),
  });
  return parseResJson(res);
}

/** PATCH /bo/menus/:id - 메뉴 수정 (등록 payload 동일) */
export async function patchBoMenu(menuId, payload) {
  const res = await fetch(`${API_BASE}/bo/menus/${menuId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResJson(res);
}

/**
 * POST /bo/menus - 메뉴 등록
 * @param {{
 *   category_id: number,
 *   name_ko: string,
 *   name_en?: string,
 *   base_price: number,
 *   description?: string,
 *   ingredients?: string,
 *   is_best?: number,
 *   images?: { image_url: string, is_main?: number, sort_order?: number }[],
 *   nutritions?: { category_id: number, value: string }[],
 *   option_group_ids?: number[]
 * }} payload
 */
export async function postBoMenus(payload) {
  const res = await fetch(`${API_BASE}/bo/menus`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResJson(res);
}

/** POST /bo/upload/menu-image - 메뉴 이미지 업로드 */
export async function uploadBoMenuImage(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/bo/upload/menu-image`, {
    method: 'POST',
    headers: getAuthOnlyHeaders(),
    body: form,
  });
  return parseResJson(res);
}
