# Phase 4: Dashboard

## 📋 작업 정의 및 목표 (What & Why)

### What
관리자가 자연어로 질의하고 인사이트를 시각화할 수 있는 웹 대시보드 MVP를 구축합니다. NestJS 서버에서 정적 파일을 제공하고, HTML/CSS/JavaScript를 사용한 단일 페이지 애플리케이션(SPA)을 구현합니다.

### Why
- 비기술 관리자도 쉽게 데이터 조회 및 분석 가능
- AI 인사이트를 직관적으로 시각화
- 실시간 비즈니스 메트릭 모니터링
- 의사결정 지원을 위한 데이터 대시보드
- NestJS 서버와 통합된 단일 애플리케이션으로 배포 간소화

### 달성 결과
- 자연어 질의 인터페이스
- 시맨틱 검색 UI
- 질의 히스토리 관리
- 실시간 메트릭 대시보드
- 반응형 디자인

---

## 🔧 기술 스펙 및 제약사항

### 사용 기술 스택

**Frontend: Vanilla JavaScript + HTML + CSS**
- HTML5
- Modern CSS (Flexbox, Grid)
- Vanilla JavaScript (ES6+)
- Font Awesome Icons
- LocalStorage for persistence

**Backend: NestJS**
- @nestjs/serve-static 모듈
- public/ 디렉토리에서 정적 파일 제공
- REST API 통합

### 장점
- 별도의 빌드 프로세스 불필요
- NestJS와 같은 서버에서 실행 (포트 3000)
- 빠른 개발 및 배포
- 의존성 최소화

### 제약사항
- 복잡한 상태 관리는 LocalStorage 활용
- 서버 사이드 렌더링 없음 (CSR)
- 대규모 데이터 처리는 백엔드에서 수행

---

## 📝 Task 목록

### Task 4.1: NestJS 정적 파일 서빙 설정

#### What & Why
NestJS 서버에서 정적 파일(HTML/CSS/JavaScript)을 제공할 수 있도록 설정합니다.

#### Tech Spec
- @nestjs/serve-static 모듈 사용
- public/ 디렉토리에서 파일 제공
- API 엔드포인트와 충돌 방지

#### How

1. 패키지 설치:
```bash
pnpm add @nestjs/serve-static
```

2. `src/app.module.ts` 수정:
```typescript
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    // ... other imports
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'public'),
      exclude: ['/api*', '/agent*', '/search*', '/indexing*'],
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

3. `public/` 디렉토리 생성

#### Acceptance Criteria
- [x] @nestjs/serve-static 패키지 설치
- [x] ServeStaticModule 설정 완료
- [x] public/ 디렉토리 생성
- [x] API 엔드포인트와 정적 파일 경로 분리

---

### Task 4.2: 대시보드 HTML/CSS 레이아웃 구현

#### What & Why
대시보드의 기본 레이아웃과 스타일을 HTML/CSS로 구현합니다.

#### Tech Spec
- Semantic HTML5
- Modern CSS (Flexbox, Grid)
- 반응형 디자인 (모바일 대응)
- Font Awesome 아이콘

#### How

1. `public/index.html` 생성:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NDMarket AI Insight Platform</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
  <!-- Header with Navigation -->
  <header class="header">
    <!-- Navigation buttons -->
  </header>

  <!-- Main Content -->
  <main class="main">
    <!-- AI Query Page -->
    <!-- Semantic Search Page -->
    <!-- History Page -->
    <!-- Metrics Page -->
  </main>

  <!-- Footer -->
  <footer class="footer">
    <!-- Footer content -->
  </footer>

  <script src="/app.js"></script>
</body>
</html>
```

2. `public/styles.css` 생성:
```css
/* CSS Variables for theming */
:root {
  --primary-color: #2563eb;
  --secondary-color: #10b981;
  --bg-color: #f8fafc;
  /* ... other variables */
}

/* Layout styles */
.header { /* ... */ }
.main { /* ... */ }
.footer { /* ... */ }

/* Component styles */
.query-input { /* ... */ }
.btn { /* ... */ }
/* ... */
```

#### Acceptance Criteria
- [x] HTML 구조 완성 (header, main, footer)
- [x] CSS 스타일링 완료
- [x] 반응형 디자인 적용
- [x] Font Awesome 아이콘 사용
- [x] 4개 페이지 레이아웃 (질의, 검색, 히스토리, 메트릭)

---

### Task 4.3: 자연어 질의 인터페이스 구현 (JavaScript)

#### What & Why
사용자가 자연어로 질의를 입력하고 AI Agent에게 전달하는 UI를 JavaScript로 구현합니다.

#### Tech Spec
- Fetch API for HTTP requests
- Event handling (input, button click)
- DOM manipulation for result display
- Error handling and loading states

#### How

1. `public/app.js`에 질의 처리 로직 추가:
```javascript
async function handleQuerySubmit() {
  const query = document.getElementById('query-input').value;

  // Show loading
  document.getElementById('query-loading').style.display = 'block';

  try {
    const response = await fetch('/agent/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    displayQueryResult(data);
  } catch (error) {
    displayError(error.message);
  } finally {
    document.getElementById('query-loading').style.display = 'none';
  }
}

function displayQueryResult(data) {
  // Display insight message
  // Display SQL query
  // Display table results
  // Display semantic search results
}
```

#### Acceptance Criteria
- [x] 질의 입력 폼 작동
- [x] POST /agent/query API 호출
- [x] 로딩 상태 표시
- [x] 결과 표시 (인사이트, SQL, 테이블, 유사 상품)
- [x] 에러 처리 구현

---

### Task 4.4: 시맨틱 검색 UI 구현

#### What & Why
Vector Search 기능을 사용한 상품 검색 UI를 구현합니다.

#### Tech Spec
- 의미 기반 검색 / 하이브리드 검색 선택
- 검색 결과 카드 레이아웃
- 유사도 스코어 표시

#### How

1. `app.js`에 검색 로직 추가:
```javascript
async function handleSearchSubmit() {
  const query = document.getElementById('search-input').value;
  const topK = document.getElementById('search-topk').value;
  const searchType = document.querySelector('input[name="search-type"]:checked').value;

  const endpoint = searchType === 'semantic'
    ? '/search/semantic'
    : '/search/hybrid';

  const response = await fetch(`${endpoint}?q=${query}&k=${topK}`);
  const data = await response.json();

  displaySearchResult(data);
}

function displaySearchResult(data) {
  // Render search result cards
  // Show similarity scores
  // Display product info
}
```

#### Acceptance Criteria
- [x] 검색 타입 선택 (의미 기반 / 하이브리드)
- [x] Top K 설정 가능
- [x] GET /search/semantic, /search/hybrid API 호출
- [x] 검색 결과 카드 형식으로 표시
- [x] 유사도 스코어 표시

---

### Task 4.5: 질의 히스토리 및 메트릭 대시보드

#### What & Why
과거 질의를 저장하고 재실행할 수 있는 기능과 시스템 메트릭을 구현합니다.

#### Tech Spec
- LocalStorage for history persistence
- Query rerun functionality
- Metrics dashboard (query count, search count, avg response time)

#### How

1. `app.js`에 히스토리 관리 추가:
```javascript
// Save to LocalStorage
function saveToLocalStorage() {
  localStorage.setItem('ndmarket-history', JSON.stringify(state.history));
}

// Load from LocalStorage
function loadFromLocalStorage() {
  const history = localStorage.getItem('ndmarket-history');
  if (history) {
    state.history = JSON.parse(history);
  }
}

// Render history
function renderHistory() {
  const historyList = document.getElementById('history-list');
  // Render history items with rerun and delete buttons
}

// Update metrics
function updateMetrics() {
  document.getElementById('metric-queries').textContent = state.history.length;
  // Calculate and display average response time
}
```

#### Acceptance Criteria
- [x] 질의 히스토리 LocalStorage 저장
- [x] 히스토리 목록 렌더링
- [x] 재실행 버튼 작동
- [x] 삭제 버튼 작동
- [x] 메트릭 대시보드 (총 질의 수, 검색 수, 평균 응답시간, API 상태)

---

### Task 4.6: 페이지 네비게이션 및 통합

#### What & Why
4개 페이지 간 전환 기능을 구현하고 전체 애플리케이션을 통합합니다.

#### Tech Spec
- SPA 방식 페이지 전환
- Active state 관리
- Smooth transitions

#### How

1. `app.js`에 페이지 전환 로직 추가:
```javascript
function switchPage(page) {
  // Update navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });

  // Show/hide pages
  document.querySelectorAll('.page').forEach(pageEl => {
    pageEl.classList.toggle('active', pageEl.id === `${page}-page`);
  });

  // Load page-specific data
  if (page === 'history') {
    renderHistory();
  } else if (page === 'metrics') {
    updateMetrics();
  }
}
```

#### Acceptance Criteria
- [x] 4개 페이지 전환 기능 (AI 질의, 시맨틱 검색, 히스토리, 메트릭)
- [x] Active state 표시
- [x] 페이드 인 애니메이션
- [x] 초기 로드 시 히스토리 복원

---

## ✅ Phase 완료 기준

- [x] NestJS 정적 파일 서빙 설정
- [x] HTML/CSS 레이아웃 구현
- [x] 자연어 질의 인터페이스 작동
- [x] AI Agent API 연동 성공
- [x] 시맨틱 검색 UI 통합
- [x] 질의 히스토리 및 재실행 기능
- [x] 메트릭 대시보드
- [x] LocalStorage 기반 데이터 저장
- [x] 반응형 레이아웃 (모바일 대응)
- [x] 로딩 상태 및 에러 처리

## 🚀 다음 단계

Phase 4 완료 후 [Phase 5: Infrastructure](./05-Infrastructure.md)로 진행하여 Terraform 기반 인프라 자동화 및 CI/CD 파이프라인을 구축합니다.

## 📂 파일 구조

```
public/
├── index.html          # 메인 HTML 페이지
├── styles.css          # 스타일시트
└── app.js             # JavaScript 로직

src/
└── app.module.ts      # ServeStaticModule 설정
```

## 🌐 접속 방법

NestJS 서버 실행 후 브라우저에서 접속:
```
http://localhost:3000
```

API 엔드포인트는 동일한 서버에서 제공:
- POST /agent/query - AI 질의
- GET /search/semantic - 의미 기반 검색
- GET /search/hybrid - 하이브리드 검색
- GET /search/similar/:id - 유사 상품 검색
