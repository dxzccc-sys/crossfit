import type { TimerType } from '@/constants/timer';

/**
 * 크로스핏 벤치마크 WOD 데이터.
 *
 * 처방은 CrossFit.com 공식 WOD 페이지와 CrossFit Journal "Benchmark Workouts" 문서를 기준으로 하고,
 * 공식 개별 페이지가 없는 종목은 CrossFit Journal 목록 + WODBase로 교차 확인했다.
 * 등급 구간은 출처가 제시한 수치를 그대로 옮긴다 — 출처가 특정 레벨을 제시하지 않으면
 * 그 등급은 아예 넣지 않는다(없는 숫자를 지어내지 않는다).
 *
 * - https://www.crossfit.com/fran /cindy /helen /grace /annie /benchmark/murph
 * - https://journal.crossfit.com/article/benchmark-workouts-2
 * - https://library.crossfit.com/free/pdf/13_03_Benchmark_Workouts.pdf
 * - https://wodprep.com/blog/crossfit-benchmark-workouts-girls-best-times/
 * - https://www.wodbase.com/girl-wods/
 */

export type WodTierKey = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface WodTier {
  key: WodTierKey;
  /** 화면에 표시할 등급 이름 */
  label: string;
  /** 출처가 제시한 기준 구간을 그대로 (예: '7–9분', '24라운드 이상') */
  range: string;
  /** 이 칸에 서면 어떤 의미인지 — 다음 칸을 노리게 만드는 한 줄 */
  blurb: string;
}

export interface PrescriptionLine {
  /** 동작 이름 (예: '스러스터') */
  movement: string;
  /** 횟수/거리만 (예: '21-15-9회', '400m') — 중량은 weightNote로 따로 뺀다 */
  detail: string;
}

export interface WodPrefill {
  amrapMin?: number;
  emomRounds?: number;
  emomMin?: number;
  tabataWork?: number;
  tabataRest?: number;
  tabataRounds?: number;
}

export interface BenchmarkWod {
  id: string;
  name: string;
  /** 이 WOD가 어떤 성격인지 한 줄로 */
  tagline: string;
  timerType: TimerType;
  /** time = 기록이 짧을수록 상위, rounds = 라운드가 많을수록 상위, reps = 총 렙이 많을수록 상위 */
  scoreUnit: 'time' | 'rounds' | 'reps';
  /** 'girls' = 벤치마크 걸스, 'hero' = 히어로 WOD, 'benchmark' = 그 외 벤치마크 */
  category: 'girls' | 'hero' | 'benchmark';
  prescription: PrescriptionLine[];
  /** 라운드/렙 구조 (예: '3라운드', '20분 AMRAP', '21-15-9') */
  roundsNote?: string;
  /** 1라운드가 무엇으로 구성되는지 — 라운드 기반 WOD에만 */
  roundBreakdown?: string;
  /** Rx 중량 (맨몸 WOD는 없음). 바벨류는 lb, 케틀벨은 kg 표기 */
  weightNote?: string;
  /** 진행 방식 보충 설명 */
  rxNote?: string;
  /** WOD의 유래 */
  story?: string;
  /** 출처가 권장하는 컷오프 — 안내용이며 타이머에 캡을 걸지는 않는다 */
  cutoffNote?: string;
  /** 공식 스케일링 옵션 */
  scaling?: string;
  /** 초보 → 엘리트 오름차순 */
  tiers: WodTier[];
  /** 등급표 출처 (WOD마다 다를 수 있어 개별 표기) */
  tierSource: string;
  /** 등급표에 대한 단서 (출처가 일부 레벨만 제시한 경우 등) */
  tiersNote?: string;
  /** 타이머 설정 화면에 미리 채울 값 */
  prefill?: WodPrefill;
}

const WODPREP_SOURCE = 'CrossFit.com 레벨별 목표 · WODprep 벤치마크 기준표';

export const BENCHMARK_WODS: BenchmarkWod[] = [
  {
    id: 'fran',
    name: 'Fran',
    tagline: '크로스핏에서 가장 유명한 WOD. 짧지만 가장 아프다.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [
      { movement: '스러스터', detail: '21-15-9회' },
      { movement: '풀업', detail: '21-15-9회' },
    ],
    roundsNote: '21-15-9 · 동작당 총 45회',
    weightNote: '스러스터 남 95 lb / 여 65 lb',
    story:
      '2003년 9월 처음 공개된 최초의 벤치마크 걸스 6종(Angie, Barbara, Chelsea, Diane, Elizabeth, Fran) 중 하나. 크로스핏에서 "네 프란 기록이 몇이야?"는 곧 실력을 묻는 말이다.',
    cutoffNote: '10~12분 안에 끝내는 것을 목표로. 그보다 길어지면 이 WOD가 노리는 스프린트 강도가 흐려진다.',
    scaling: '중급: 스러스터 21-15-9 + 풀업 12-9-6, 75/55 lb · 초보: 스러스터 21-15-9 + 링로우, 45/35 lb',
    tiers: [
      { key: 'beginner', label: '초보', range: '7~9분', blurb: '완주 자체가 성과다. 동작을 끊더라도 끝까지 간다.' },
      { key: 'intermediate', label: '중급', range: '6~7분', blurb: '박스에서 꾸준히 운동한 사람의 기록. 여기서 정체하기 쉽다.' },
      { key: 'advanced', label: '상급', range: '4~6분', blurb: '풀업을 크게 안 끊는다는 뜻. 대부분의 목표 지점.' },
      { key: 'elite', label: '엘리트', range: '3분 미만', blurb: '사실상 무중단. 박스에서 손에 꼽히는 기록이다.' },
    ],
    tierSource: WODPREP_SOURCE,
  },
  {
    id: 'cindy',
    name: 'Cindy',
    tagline: '맨몸으로만 20분. 장비 없이도 무너질 수 있다는 증거.',
    timerType: 'AMRAP',
    scoreUnit: 'rounds',
    category: 'girls',
    prescription: [
      { movement: '풀업', detail: '5회' },
      { movement: '푸시업', detail: '10회' },
      { movement: '에어 스쿼트', detail: '15회' },
    ],
    roundsNote: '20분 AMRAP · 시간 내 최대 라운드',
    roundBreakdown: '1R = 풀업 5회 + 푸시업 10회 + 에어 스쿼트 15회',
    rxNote: '점수는 완료한 라운드 + 렙 수. 맨몸으로만 진행한다.',
    story: '맨몸 체조 능력을 시험하는 대표 벤치마크. 장비가 하나도 없는 곳에서도 그대로 할 수 있어 가장 널리 쓰인다.',
    scaling: '초보: 12분 동안 링로우 3 · 무릎 푸시업 6 · 스쿼트 9',
    tiers: [
      { key: 'beginner', label: '초보', range: '11~12라운드', blurb: '20분을 버텨낸 것만으로 충분하다. 다음엔 한 라운드만 더.' },
      { key: 'intermediate', label: '중급', range: '13~17라운드', blurb: '푸시업에서 쉬기 시작하는 구간. 페이스 조절이 승부처다.' },
      { key: 'advanced', label: '상급', range: '19~22라운드', blurb: '라운드당 1분 이내. 쉬지 않고 계속 움직인다는 뜻.' },
      { key: 'elite', label: '엘리트', range: '24라운드 이상', blurb: '20분 내내 무중단. CrossFit.com이 말하는 최상위 구간.' },
    ],
    tierSource: WODPREP_SOURCE,
    prefill: { amrapMin: 20 },
  },
  {
    id: 'helen',
    name: 'Helen',
    tagline: '달리기가 들어간 걸스. 폐와 그립을 동시에 태운다.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [
      { movement: '런', detail: '400m' },
      { movement: '케틀벨 스윙', detail: '21회' },
      { movement: '풀업', detail: '12회' },
    ],
    roundsNote: '3라운드',
    roundBreakdown: '1R = 400m 런 + 케틀벨 스윙 21회 + 풀업 12회',
    weightNote: '케틀벨 남 24kg / 여 16kg',
    cutoffNote: '15분을 넘기지 않는 것이 좋다. 평균 완주 시간은 10~12분.',
    scaling: '초보: 200m 런 · 케틀벨 스윙 15회(12/8kg) · 점핑 풀업 9회',
    tiers: [
      { key: 'beginner', label: '초보', range: '15~17분', blurb: '3라운드 완주. 달리기 후 그립이 남아 있는지가 관건이다.' },
      { key: 'intermediate', label: '중급', range: '11~14분', blurb: '가장 많은 사람이 서 있는 구간. 런 페이스를 아끼면 줄어든다.' },
      { key: 'advanced', label: '상급', range: '9~10분', blurb: '400m를 90초대로 끊으면서 풀업을 버틴다는 뜻.' },
      { key: 'elite', label: '엘리트', range: '8분 미만', blurb: '전 구간 무중단에 가깝다. 최상위권 기록.' },
    ],
    tierSource: WODPREP_SOURCE,
  },
  {
    id: 'grace',
    name: 'Grace',
    tagline: '동작은 하나. 쉴 방법도 하나 — 그냥 멈추는 것뿐.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [{ movement: '클린 앤 저크', detail: '30회' }],
    weightNote: '남 135 lb / 여 95 lb',
    story: '바벨 사이클링 능력을 그대로 드러내는 WOD. 기술이 좋으면 시간이 줄고, 힘으로 버티면 금방 막힌다.',
    cutoffNote: '7~8분을 넘기지 않는 것이 좋다. 평균은 4~7분.',
    scaling: '중급: 남 115 lb / 여 75 lb · 초보: 남 75 lb / 여 55 lb',
    tiers: [
      { key: 'beginner', label: '초보', range: '6~7분', blurb: '30회를 다 든 것 자체가 성과. 한 개씩 끊어 가도 좋다.' },
      { key: 'intermediate', label: '중급', range: '4~5분', blurb: '싱글로 리듬을 만드는 단계. 여기서 기술 차이가 벌어진다.' },
      { key: 'advanced', label: '상급', range: '3~4분', blurb: '터치앤고 세트가 붙기 시작한다.' },
      { key: 'elite', label: '엘리트', range: '2분 미만', blurb: '거의 쉬지 않는다. 바벨 사이클링 최상위.' },
    ],
    tierSource: WODPREP_SOURCE,
  },
  {
    id: 'isabel',
    name: 'Isabel',
    tagline: 'Grace의 사촌. 같은 무게, 더 어려운 동작.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [{ movement: '스내치', detail: '30회' }],
    weightNote: '남 135 lb / 여 95 lb',
    story: 'Grace와 같은 30회·같은 중량이지만 동작이 스내치라 기술 요구가 훨씬 높다. 두 기록을 비교하면 자신의 약점이 힘인지 기술인지 드러난다.',
    scaling: '중량을 낮춰 15회 이상 연속으로 갈 수 있는 무게로 조정',
    tiers: [
      { key: 'beginner', label: '초보', range: '6~7분', blurb: '싱글로 30회. 자세가 무너지면 무게를 내리는 게 맞다.' },
      { key: 'intermediate', label: '중급', range: '4~6분', blurb: '파워 스내치로 안정적인 리듬을 만드는 단계.' },
      { key: 'advanced', label: '상급', range: '3~4분', blurb: '빠른 싱글, 거의 쉬지 않는 리듬.' },
      { key: 'elite', label: '엘리트', range: '2분 미만', blurb: '초당 한 개꼴. 기술이 완성된 사람의 기록.' },
    ],
    tierSource: WODPREP_SOURCE,
  },
  {
    id: 'diane',
    name: 'Diane',
    tagline: '무거운 데드리프트와 거꾸로 선 채로 미는 힘.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [
      { movement: '데드리프트', detail: '21-15-9회' },
      { movement: '핸드스탠드 푸시업', detail: '21-15-9회' },
    ],
    roundsNote: '21-15-9 · 동작당 총 45회',
    weightNote: '데드리프트 남 225 lb / 여 155 lb',
    story: '2003년 최초 걸스 6종 중 하나. 근력과 도립 능력을 동시에 요구해 Rx로 하는 사람이 확 줄어드는 WOD다.',
    scaling: '데드리프트 남 135 lb / 여 95 lb · 핸드스탠드 푸시업 대신 파이크 푸시업이나 박스에 발 올린 푸시업',
    tiers: [
      { key: 'intermediate', label: '중급', range: '6~9분', blurb: 'Rx로 완주했다면 이미 상위권에 가깝다.' },
      { key: 'advanced', label: '상급', range: '5~6분', blurb: 'HSPU를 큰 세트로 끊는다는 뜻.' },
      { key: 'elite', label: '엘리트', range: '4분 미만', blurb: '데드리프트가 무겁게 느껴지지 않는 수준.' },
    ],
    tierSource: WODPREP_SOURCE,
    tiersNote: '출처가 초보 구간은 제시하지 않는다 — Rx 중량 자체가 이미 상당한 근력을 전제하기 때문이다.',
  },
  {
    id: 'elizabeth',
    name: 'Elizabeth',
    tagline: '클린과 링 딥. 당기고 미는 힘을 번갈아 태운다.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [
      { movement: '스쿼트 클린', detail: '21-15-9회' },
      { movement: '링 딥', detail: '21-15-9회' },
    ],
    roundsNote: '21-15-9 · 동작당 총 45회',
    weightNote: '스쿼트 클린 남 135 lb / 여 95 lb',
    story: '2003년 최초 걸스 6종 중 하나. 링 딥에서 어깨가 지치면 클린 랙 포지션까지 흔들리는 연쇄가 특징이다.',
    scaling: '중량을 낮추고, 링 딥 대신 박스 딥이나 밴드 보조 링 딥',
    tiers: [
      { key: 'intermediate', label: '중급', range: '7~10분', blurb: 'Rx 완주. 링 딥에서 얼마나 버티느냐가 전부다.' },
      { key: 'advanced', label: '상급', range: '4~7분', blurb: '두 동작 모두 큰 세트로 소화한다.' },
      { key: 'elite', label: '엘리트', range: '4분 미만', blurb: '링에서 흔들리지 않는다. 최상위 기록.' },
    ],
    tierSource: WODPREP_SOURCE,
    tiersNote: '출처가 초보 구간은 제시하지 않는다 — 링 딥이 가능해야 성립하는 WOD이기 때문이다.',
  },
  {
    id: 'annie',
    name: 'Annie',
    tagline: '줄넘기와 복근. 장비는 거의 없는데 숨이 가장 찬다.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [
      { movement: '더블 언더', detail: '50-40-30-20-10회' },
      { movement: '싯업', detail: '50-40-30-20-10회' },
    ],
    roundsNote: '50-40-30-20-10 · 동작당 총 150회',
    rxNote: '줄넘기 하나와 매트만 있으면 된다.',
    scaling: '초보: 싱글 언더로 35-25-15-10-5 · 중급: 더블 언더로 30-25-20-15-10',
    tiers: [
      { key: 'beginner', label: '초보', range: '10~12분', blurb: '더블 언더가 걸려도 계속 시도한 결과. 줄넘기 연습이 곧 기록 단축이다.' },
      { key: 'intermediate', label: '중급', range: '8~10분', blurb: '더블 언더가 어느 정도 이어진다는 뜻.' },
      { key: 'advanced', label: '상급', range: '7~8분', blurb: '50개를 한 번에 넘긴다. CrossFit.com 기준 Rx 구간.' },
      { key: 'elite', label: '엘리트', range: '6분 미만', blurb: '줄이 거의 안 걸린다. 싯업 속도가 승부처가 되는 수준.' },
    ],
    tierSource: WODPREP_SOURCE,
  },
  {
    id: 'karen',
    name: 'Karen',
    tagline: '월볼 150개. 그게 전부이고, 그래서 잔인하다.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [{ movement: '월볼 샷', detail: '150회' }],
    weightNote: '남 20 lb 볼 · 10 ft 타깃 / 여 14 lb 볼 · 9 ft 타깃',
    story: '단일 동작 150회. 다리와 어깨가 동시에 지치는데 쉴 곳이 없어 정신력 테스트로 자주 쓰인다.',
    scaling: '볼 무게를 낮추거나(14/10 lb) 타깃 높이를 내려 세트가 끊기지 않게',
    tiers: [
      { key: 'beginner', label: '초보', range: '12~15분', blurb: '150개를 다 채웠다. 세트를 잘게 쪼개는 것도 전략이다.' },
      { key: 'intermediate', label: '중급', range: '8~11분', blurb: '20~25개씩 끊어 가는 단계. 호흡을 놓치면 급격히 느려진다.' },
      { key: 'advanced', label: '상급', range: '6~7분', blurb: '50개 단위로 끊는다는 뜻. 다리가 버텨 준다.' },
      { key: 'elite', label: '엘리트', range: '5분 미만', blurb: '거의 무중단 150개. 최상위권.' },
    ],
    tierSource: WODPREP_SOURCE,
  },
  {
    id: 'angie',
    name: 'Angie',
    tagline: '맨몸 400회. 한 동작을 다 끝내야 다음으로 넘어간다.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'girls',
    prescription: [
      { movement: '풀업', detail: '100회' },
      { movement: '푸시업', detail: '100회' },
      { movement: '싯업', detail: '100회' },
      { movement: '에어 스쿼트', detail: '100회' },
    ],
    roundsNote: '단일 라운드 · 총 400회',
    rxNote: '반드시 이 순서대로. 한 동작 100회를 모두 끝낸 뒤 다음 동작으로 넘어간다.',
    story: '2003년 최초 걸스 6종 중 하나. 풀업 100개를 먼저 다 해야 해서 시작부터 그립이 무너지는 구조다.',
    scaling: '각 동작 50회씩으로 절반 감량',
    tiers: [
      { key: 'beginner', label: '초보', range: '26~35분', blurb: '400회 완주. 풀업 100개를 통과한 것만으로 큰 고비를 넘겼다.' },
      { key: 'intermediate', label: '중급', range: '21~25분', blurb: '앞부분에서 덜 무너진다는 뜻. 페이스 배분이 핵심.' },
      { key: 'advanced', label: '상급', range: '15~20분', blurb: '푸시업 구간에서도 큰 세트가 유지된다.' },
      { key: 'elite', label: '엘리트', range: '14분 미만', blurb: '평균 분당 30회 가까이. 맨몸 능력 최상위.' },
    ],
    tierSource: WODPREP_SOURCE,
  },
  {
    id: 'chelsea',
    name: 'Chelsea',
    tagline: 'Cindy를 매 분 시작으로 바꾼 것. 쉬는 시간은 네가 번 만큼만.',
    timerType: 'EMOM',
    scoreUnit: 'rounds',
    category: 'girls',
    prescription: [
      { movement: '풀업', detail: '5회' },
      { movement: '푸시업', detail: '10회' },
      { movement: '에어 스쿼트', detail: '15회' },
    ],
    roundsNote: '30분 EMOM · 30라운드',
    roundBreakdown: '매 분 = 풀업 5회 + 푸시업 10회 + 에어 스쿼트 15회',
    rxNote: '매 분 시작에 30회를 모두 끝내야 하고, 남는 시간이 곧 휴식이다.',
    story:
      '2003년 최초 걸스 6종 중 하나. Cindy와 동작이 같지만 EMOM이라 페이스를 스스로 조절할 수 없다는 점이 결정적으로 다르다.',
    scaling: '초보: 풀업 2 · 푸시업 4 · 에어 스쿼트 6으로 감량하거나, 라운드 수를 20분으로 축소',
    tiers: [
      {
        key: 'intermediate',
        label: '중급',
        range: '30라운드 전부 완주',
        blurb: 'Rx로 30분을 다 채웠다면 그것이 이 WOD의 통과 기준이다.',
      },
    ],
    tierSource: WODPREP_SOURCE,
    tiersNote:
      '출처는 이 WOD에 대해 레벨별 세부 구간을 제시하지 않는다 — 30라운드를 Rx로 완주하는 것 자체가 기준선이다. 도중에 못 따라가면 몇 라운드까지 갔는지가 기록이 된다.',
    prefill: { emomRounds: 30, emomMin: 1 },
  },
  {
    id: 'murph',
    name: 'Murph',
    tagline: '전사한 네이비씰 중위를 기리는 WOD. 메모리얼 데이의 상징.',
    timerType: 'FOR_TIME',
    scoreUnit: 'time',
    category: 'hero',
    prescription: [
      { movement: '런', detail: '1마일 (약 1.6km)' },
      { movement: '풀업', detail: '100회' },
      { movement: '푸시업', detail: '200회' },
      { movement: '에어 스쿼트', detail: '300회' },
      { movement: '런', detail: '1마일 (약 1.6km)' },
    ],
    roundsNote: '단일 라운드 (가운데 세 동작은 분할 가능)',
    roundBreakdown: '분할 시 보통 20R = 풀업 5회 + 푸시업 10회 + 에어 스쿼트 15회',
    weightNote: '조끼 남 20 lb / 여 14 lb (있는 경우 착용)',
    rxNote: '1마일 런과 마지막 1마일 런 사이의 세 동작만 원하는 대로 나눠서 할 수 있다.',
    story:
      '2005년 6월 28일 아프가니스탄에서 전사한 미 해군 특수부대(SEAL) 마이클 머피 중위를 기리는 히어로 WOD. 2005년 8월 18일 공식 등록됐고, 지금은 전 세계 박스가 메모리얼 데이에 함께 하는 전통이 됐다.',
    cutoffNote: '46분을 넘긴다면 스케일 버전으로 내리는 편이 낫다.',
    scaling: '조끼 없이 진행하거나, 절반 분량(1/2 Murph)으로. 풀업은 링로우나 밴드 보조로 대체',
    tiers: [
      { key: 'intermediate', label: '중급 (Rx 완주)', range: '36~46분', blurb: 'Rx로 완주. 이 WOD는 기록보다 끝냈다는 사실이 먼저다.' },
      { key: 'elite', label: '엘리트', range: '35분 미만', blurb: '조끼를 입고도 페이스가 무너지지 않는다는 뜻.' },
    ],
    tierSource: 'CrossFit.com 공식 Murph 페이지',
    tiersNote: '출처는 Rx 완주 구간과 엘리트 구간만 제시한다. 46분을 넘기면 스케일을 권장한다.',
  },
  {
    id: 'tabata-something-else',
    name: 'Tabata Something Else',
    tagline: '20초 운동 / 10초 휴식 × 32세트. 쉬는 구간이 있는데도 끝까지 간 사람이 드물다.',
    timerType: 'TABATA',
    scoreUnit: 'reps',
    category: 'benchmark',
    prescription: [
      { movement: '풀업', detail: '1~8번째 인터벌' },
      { movement: '푸시업', detail: '9~16번째 인터벌' },
      { movement: '싯업', detail: '17~24번째 인터벌' },
      { movement: '에어 스쿼트', detail: '25~32번째 인터벌' },
    ],
    roundsNote: '32인터벌 · 20초 운동 / 10초 휴식 · 총 16분',
    roundBreakdown: '동작당 8인터벌씩 (풀업 → 푸시업 → 싯업 → 에어 스쿼트)',
    rxNote: '동작이 바뀔 때도 추가 휴식 없이 이어서 진행한다. 점수는 32인터벌 전체의 총 렙 수.',
    story: 'CrossFit.com WOD 아카이브에 여러 차례 등장한 타바타 벤치마크. 총 16분이지만 실제 운동 시간은 10분 40초뿐이다.',
    scaling: '풀업을 링로우나 점핑 풀업으로, 푸시업을 무릎 푸시업으로 대체해도 인터벌 구조는 그대로 유지',
    tiers: [
      { key: 'beginner', label: '초보', range: '약 200~300렙', blurb: '32인터벌을 전부 소화했다. 후반 스쿼트에서 렙이 얼마나 남느냐가 관건.' },
      { key: 'advanced', label: '상급', range: '약 350~450렙', blurb: '인터벌당 평균 12렙 이상. 후반에도 페이스가 크게 안 떨어진다.' },
      { key: 'elite', label: '엘리트', range: '약 500렙 이상', blurb: '거의 모든 인터벌에서 15렙 이상. 최상위권.' },
    ],
    tierSource: '커뮤니티 참고치 — CrossFit이 이 WOD에 대해서는 공식 레벨 기준을 발표하지 않았다',
    tiersNote:
      '위 구간은 공식 기준이 아니라 참고치다. 이 WOD의 핵심은 "각 인터벌에서 렙이 얼마나 덜 떨어지느냐"이므로, 첫 두 인터벌을 전력으로 가지 말고 일정한 페이스를 유지하는 편이 총점이 높다.',
    prefill: { tabataWork: 20, tabataRest: 10, tabataRounds: 32 },
  },
];

export function findWod(id: string | undefined): BenchmarkWod | undefined {
  if (!id) return undefined;
  return BENCHMARK_WODS.find((w) => w.id === id);
}

/** 점수 단위별로 "무엇이 더 좋은 기록인지" 한 줄 설명 */
export const SCORE_UNIT_HINT: Record<BenchmarkWod['scoreUnit'], string> = {
  time: '기록이 짧을수록 상위',
  rounds: '라운드가 많을수록 상위',
  reps: '총 렙이 많을수록 상위',
};
