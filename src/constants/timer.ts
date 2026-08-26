/** 타이머 종류 — 화면(index/timer/wods) 여러 곳에서 쓰이므로 여기서 한 번만 선언 */
export type TimerType = 'AMRAP' | 'FOR_TIME' | 'EMOM' | 'TABATA';

export const TYPE_COLORS: Record<TimerType, string> = {
  AMRAP: '#FF6B35',
  FOR_TIME: '#4ECDC4',
  EMOM: '#45B7D1',
  TABATA: '#9B59B6',
};

export const TYPE_LABELS: Record<TimerType, string> = {
  AMRAP: 'AMRAP',
  FOR_TIME: 'FOR TIME',
  EMOM: 'EMOM',
  TABATA: 'TABATA',
};

/**
 * 타이머 설정값의 허용 범위. 설정 화면의 스테퍼와 WOD에서 넘어오는 프리필 파라미터가
 * 같은 기준을 쓰도록 여기서 공유한다 (한쪽만 바뀌면 값이 조용히 잘리는 것을 방지).
 */
export const LIMITS = {
  amrapMin: { min: 1, max: 60 },
  forTimeCapMin: { min: 1, max: 60 },
  emomRounds: { min: 1, max: 60 },
  emomMinPerRound: { min: 1, max: 5 },
  // 타바타 계열 벤치마크(Tabata Something Else)는 32라운드가 필요해 상한을 40으로 둔다
  tabataWork: { min: 5, max: 120 },
  tabataRest: { min: 5, max: 120 },
  tabataRounds: { min: 1, max: 40 },
} as const;
