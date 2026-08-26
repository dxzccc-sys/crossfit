@AGENTS.md
# CrossFit Timer App

## 프로젝트 개요
크로스핏 운동용 타이머 + WOD(운동 세트) 추천 앱. MVP 단계로 기능은 최소한으로 유지.

## 기술 스택
- Expo (React Native + TypeScript)
- expo-router (파일 기반 라우팅)
- AsyncStorage (로컬 저장, 서버/백엔드 없음)
- expo-av (타이머 비프음)

## 화면 구조 (app/ 폴더)
- index.tsx — 홈: 타이머 타입 선택 + 오늘의 추천 WOD 배너
- timer.tsx — 타이머 설정/실행
- wods.tsx — 벤치마크 WOD 목록/추천
- result.tsx — 기록 입력 + 퍼센타일 결과

## 타이머 스펙
- AMRAP: 총 시간 카운트다운, 라운드/렙 탭 카운터
- FOR TIME: 카운트업 스톱워치, 선택적 타임캡
- EMOM: 라운드 수 × 라운드당 시간, 매 라운드 비프음
- TABATA: 20초 작업 / 10초 휴식 × 8라운드 (커스텀 가능하게)

## 데이터
- data/benchmarkWods.json 에 벤치마크 WOD + 퍼센타일 구간 테이블 하드코딩
- 서버/DB 없음. 사용자 기록은 AsyncStorage에만 저장
- FOR TIME은 시간 짧을수록, AMRAP은 라운드 많을수록 상위 퍼센타일

## 코딩 컨벤션
- 컴포넌트는 함수형 + TypeScript
- 스타일은 StyleSheet.create 사용 (인라인 스타일 지양)
- 커밋 메시지는 한글로 간단히 (예: "타이머 화면 추가")

## 하지 말 것
- 백엔드/DB 붙이지 않기 (MVP 이후로 미룸)
- 회원가입/로그인 기능 넣지 않기