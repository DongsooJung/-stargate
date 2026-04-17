# 차트 라이브러리 추천 Top 5 (JavaScript/Web)

> 프로젝트 기술 스택: HTML/CSS/JS (바닐라)

---

## 1. Chart.js — 가장 쉽고 빠른 시작

- **사이트**: https://www.chartjs.org
- **라이선스**: MIT (무료)
- **렌더링**: Canvas
- **번들 크기**: ~14KB (트리 셰이킹 시) ~ 48KB (전체)
- **차트 종류**: 8가지 기본 + 확장 시 16가지

**장점**
- 문서가 잘 정리되어 있고 학습 곡선이 낮음
- CDN 한 줄로 바로 사용 가능 (바닐라 JS 프로젝트에 최적)
- 반응형 차트 기본 지원
- 플러그인 생태계가 풍부

**단점**
- 고도로 커스터마이징된 차트에는 한계
- 대용량 데이터셋에서 성능 저하 가능

**적합한 경우**: 빠른 프로토타이핑, 중소규모 프로젝트, 대시보드

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

---

## 2. Apache ECharts — 대용량 데이터 & 고성능

- **사이트**: https://echarts.apache.org
- **라이선스**: Apache 2.0 (무료)
- **렌더링**: Canvas / SVG / WebGL (3D)
- **차트 종류**: 20가지 이상

**장점**
- 1,000만 데이터 포인트도 실시간 렌더링 (프로그레시브 렌더링)
- 차트 종류가 매우 다양 (지도, 3D, 트리맵, 산키 등)
- 인터랙티브 기능이 강력 (줌, 브러시, 연동)
- 한국어 포함 다국어 지원

**단점**
- 번들 크기가 큰 편
- 완전한 커스터마이징은 D3.js보다 제한적

**적합한 경우**: 대용량 데이터, 복잡한 비즈니스 대시보드, 지도 시각화

```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
```

---

## 3. ApexCharts — 아름다운 디자인 & 쉬운 사용

- **사이트**: https://apexcharts.com
- **라이선스**: MIT (무료)
- **렌더링**: SVG
- **차트 종류**: 12가지 이상 (혼합 차트 포함)

**장점**
- 기본 디자인이 매우 세련됨 (별도 스타일링 없이도 보기 좋음)
- 실시간 데이터 업데이트 지원
- 인터랙티브 기능 (줌, 팬, 툴팁) 기본 내장
- 바닐라 JS, React, Vue, Angular 모두 지원

**단점**
- SVG 기반이라 수천 개 이상 데이터 포인트에서 성능 저하
- 일부 고급 차트 유형 부족

**적합한 경우**: 모니터링 대시보드, 실시간 차트, 디자인이 중요한 프로젝트

```html
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
```

---

## 4. D3.js — 완전한 자유도 & 커스터마이징

- **사이트**: https://d3js.org
- **라이선스**: ISC (무료)
- **렌더링**: SVG / Canvas / HTML
- **차트 종류**: 무제한 (직접 구축)

**장점**
- 어떤 시각화든 만들 수 있는 완전한 자유도
- 데이터 바인딩과 애니메이션이 강력
- 웹 표준(SVG, CSS)을 직접 다루므로 스타일링 자유로움
- 가장 큰 커뮤니티와 예제 생태계

**단점**
- 학습 곡선이 가파름 (간단한 차트도 코드량이 많음)
- 기본 제공 차트가 없음 (모든 것을 직접 구성)
- 개발 시간이 오래 걸림

**적합한 경우**: 독창적인 데이터 시각화, 인포그래픽, 학술/연구용 차트

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
```

---

## 5. Plotly.js — 데이터 과학 & 분석

- **사이트**: https://plotly.com/javascript
- **라이선스**: MIT (무료)
- **렌더링**: SVG + WebGL
- **차트 종류**: 40가지 이상

**장점**
- 과학/통계 차트 종류가 가장 다양 (히트맵, 등고선, 3D 등)
- WebGL 기반 3D 차트 지원
- 인터랙티브 기능 우수 (호버, 줌, 선택)
- Python/R과 연동이 좋아 데이터 분석 파이프라인에 적합

**단점**
- 번들 크기가 매우 큼 (~3MB)
- 일반적인 비즈니스 차트에는 과한 편
- 커스터마이징 자유도가 D3.js보다 낮음

**적합한 경우**: 과학 데이터 시각화, 3D 차트, 데이터 분석 대시보드

```html
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
```

---

## 6. Highcharts — 엔터프라이즈 & 금융 차트

- **사이트**: https://www.highcharts.com
- **라이선스**: 개인/비영리 무료, 상업용 유료
- **렌더링**: SVG
- **차트 종류**: 20가지 이상 (주식/금융 특화 모듈 별도)

**장점**
- 가장 오래되고 성숙한 라이브러리 (2009년~)
- 웹 접근성(WAI-ARIA, 스크린리더) 업계 최고 수준
- 주식/재무 차트(Highstock), 지도(Highmaps) 전용 제품
- 방대한 문서와 예제, 엔터프라이즈 지원

**단점**
- 상업적 용도에는 유료 라이선스 필요
- 번들 크기가 큰 편

**적합한 경우**: 금융 대시보드, 엔터프라이즈 제품, 접근성이 중요한 공공기관

```html
<script src="https://code.highcharts.com/highcharts.js"></script>
```

---

## 7. amCharts — 다양한 차트 & 지도 시각화

- **사이트**: https://www.amcharts.com
- **라이선스**: 워터마크 있는 무료 / 유료 라이선스
- **렌더링**: Canvas (v5부터) / SVG
- **차트 종류**: 30가지 이상 + 지도

**장점**
- 차트 종류가 매우 풍부 (캔들스틱, 퍼널, 레이더, 게이지 등)
- 지도 시각화(amCharts Maps)가 강력
- v5에서 성능 대폭 개선 (5분 내 대시보드 POC 제작 가능)
- 애니메이션과 인터랙션이 부드러움

**단점**
- 무료 버전에는 워터마크 표시
- API가 다소 복잡

**적합한 경우**: 지도 기반 시각화, 다양한 차트가 필요한 분석 도구

```html
<script src="https://cdn.amcharts.com/lib/5/index.js"></script>
```

---

## 8. Recharts — React 전용 선언형 차트

- **사이트**: https://recharts.org
- **라이선스**: MIT (무료)
- **렌더링**: SVG (D3 기반)
- **차트 종류**: 기본 차트 위주 (Line, Bar, Area, Pie, Radar 등)

**장점**
- React 컴포넌트 기반의 선언형 API
- JSX로 차트를 조합하는 방식이 직관적
- Props로 데이터 전달, React 개발자에게 친숙
- 반응형 기본 지원 (`ResponsiveContainer`)

**단점**
- React 전용 (바닐라 JS에서 사용 불가)
- 고급 차트나 대용량 데이터에는 부적합

**적합한 경우**: React 기반 대시보드, Next.js 프로젝트

```bash
npm install recharts
```

---

## 9. Victory — React 컴포저블 차트 (웹 + 모바일)

- **사이트**: https://commerce.nearform.com/open-source/victory
- **라이선스**: MIT (무료)
- **렌더링**: SVG
- **차트 종류**: 기본 차트 + Victory Native (React Native 지원)

**장점**
- React + React Native 동일 API 지원 (크로스 플랫폼)
- 조합 가능한(composable) 컴포넌트 설계
- 접근성(ARIA) 기본 지원
- 애니메이션과 트랜지션이 세련됨

**단점**
- React 전용
- 커뮤니티가 Recharts보다 작음
- 복잡한 커스터마이징은 어려움

**적합한 경우**: React Native 모바일 앱, 웹/앱 크로스 플랫폼 프로젝트

```bash
npm install victory
```

---

## 10. CanvasJS — 고성능 Canvas 차트

- **사이트**: https://canvasjs.com
- **라이선스**: 개인 무료 / 상업용 유료
- **렌더링**: Canvas (HTML5)
- **차트 종류**: 30가지 이상

**장점**
- Canvas 기반으로 매우 빠른 성능 (SVG 대비 10배 주장)
- 10만 개 이상 데이터 포인트도 부드럽게 렌더링
- 실시간 차트(주식 등)에 최적화
- IE8 포함 구형 브라우저 호환성

**단점**
- 상업적 용도에는 유료 라이선스 필요
- 디자인이 다른 라이브러리에 비해 다소 올드함
- Canvas라 DOM 접근이 제한적

**적합한 경우**: 실시간 주식/IoT 대시보드, 레거시 브라우저 지원 필요

```html
<script src="https://canvasjs.com/assets/script/canvasjs.min.js"></script>
```

---

## 전체 비교 요약 (10개)

| 라이브러리 | 난이도 | 성능 | 차트 종류 | 라이선스 | 바닐라 JS |
|-----------|--------|------|-----------|---------|-----------|
| **Chart.js** | ⭐ | 보통 | 8+ | MIT | ✅ |
| **ECharts** | ⭐⭐ | 매우 좋음 | 20+ | Apache 2.0 | ✅ |
| **ApexCharts** | ⭐ | 낮음 | 12+ | MIT | ✅ |
| **D3.js** | ⭐⭐⭐ | 좋음 | 무제한 | ISC | ✅ |
| **Plotly.js** | ⭐⭐ | 좋음 | 40+ | MIT | ✅ |
| **Highcharts** | ⭐⭐ | 좋음 | 20+ | 상업용 유료 | ✅ |
| **amCharts** | ⭐⭐ | 좋음 | 30+ | 워터마크/유료 | ✅ |
| **Recharts** | ⭐ | 보통 | 기본 | MIT | ❌ (React) |
| **Victory** | ⭐⭐ | 보통 | 기본 | MIT | ❌ (React) |
| **CanvasJS** | ⭐ | 매우 좋음 | 30+ | 상업용 유료 | ✅ |

## 추천 조합

현재 프로젝트(바닐라 HTML/JS)에 가장 적합한 조합:

- **빠르게 시작**: **Chart.js** (CDN 한 줄로 바로 사용)
- **디자인 중시**: **ApexCharts** (기본 스타일이 가장 세련됨)
- **데이터가 많다면**: **Apache ECharts** 또는 **CanvasJS** (대용량 최적화)
- **접근성 필요**: **Highcharts** (WAI-ARIA 최고 수준)
- **지도 시각화**: **amCharts** 또는 **ECharts**
