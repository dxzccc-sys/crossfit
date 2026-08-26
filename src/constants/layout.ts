import { useWindowDimensions } from 'react-native';

/** 기준 화면 짧은 변 (iPhone 13 / 갤럭시 S 계열 논리 폭) */
const BASE_SHORT_SIDE = 390;

/** 아주 작은 기기(SE)와 태블릿 양쪽에서 극단으로 가지 않게 클램프 */
const MIN_SCALE = 0.82;
const MAX_SCALE = 1.3;

/**
 * 화면 크기에 비례해 폰트/여백 크기를 조정하기 위한 훅.
 * `ms(size)`로 기준 화면에서의 크기를 감싸면 기기 크기에 맞게 스케일된다.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const shortSide = Math.min(width, height);
  const scale = Math.min(Math.max(shortSide / BASE_SHORT_SIDE, MIN_SCALE), MAX_SCALE);
  const ms = (size: number) => Math.round(size * scale);
  return { width, height, isLandscape, scale, ms };
}
