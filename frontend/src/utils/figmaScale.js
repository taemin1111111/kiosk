import { useEffect, useState } from 'react';

const BASE_W = 360;
const BASE_H = 690;
const DESKTOP_BREAKPOINT = 768;
const RESIZE_DEBOUNCE_MS = 150;

/**
 * - 데스크톱(>=768px): scale=1 → 360px 고정, 중앙 정렬 (폰 미리보기)
 * - 모바일(<768px): scale = min(w/360, h/690) → 화면에 딱 맞춤, 스크롤 없음
 */
export function computeScale() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w >= DESKTOP_BREAKPOINT) return 1;
  return Math.min(w / BASE_W, h / BASE_H);
}

/**
 * resize 디바운스 + 초기값 적용. 키보드/주소창 등으로 인한 깜빡임 방지.
 */
export function useScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let timeoutId = null;
    const update = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setScale(computeScale()), RESIZE_DEBOUNCE_MS);
    };
    setScale(computeScale());
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return scale;
}
