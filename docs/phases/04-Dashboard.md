# Phase 4: Dashboard

## 📋 작업 정의 및 목표 (What & Why)

### What
관리자가 자연어로 질의하고 인사이트를 시각화할 수 있는 대시보드 MVP를 구축합니다. QuickSight 또는 Streamlit을 사용하여 데이터 시각화 및 실시간 모니터링 기능을 제공합니다.

### Why
- 비기술 관리자도 쉽게 데이터 조회 및 분석 가능
- AI 인사이트를 직관적으로 시각화
- 실시간 비즈니스 메트릭 모니터링
- 의사결정 지원을 위한 데이터 대시보드

### 달성 결과
- 자연어 질의 인터페이스
- 차트 및 그래프 자동 생성
- 실시간 인사이트 표시
- 저장된 질의 및 즐겨찾기 기능

---

## 🔧 기술 스펙 및 제약사항

### 사용 기술 스택

**Option A: Amazon QuickSight**
- QuickSight Embedded Analytics
- QuickSight API for custom integration
- Server-side rendering

**Option B: Streamlit (권장 - MVP 빠른 개발)**
- Streamlit 1.30+
- Plotly/Altair for charts
- Python FastAPI backend
- WebSocket for real-time updates

**Frontend (Custom UI - Optional)**
- React 18 + TypeScript
- Recharts or Chart.js
- TanStack Query (React Query)
- Tailwind CSS

### 제약사항
- QuickSight: 비용이 높음, 사용자당 과금
- Streamlit: 프로덕션 스케일링 제한적
- Custom React: 개발 시간 길지만 유연성 높음

---

## 📝 Task 목록

### Task 4.1: 대시보드 기술 스택 선택 및 설정

#### What & Why
MVP를 위한 최적의 대시보드 솔루션을 선택하고 초기 설정을 완료합니다.

#### Tech Spec
**권장: Streamlit** (빠른 MVP 개발)
- Streamlit 1.30+
- Python 3.10+
- NestJS API와 연동

#### How

1. Streamlit 프로젝트 생성:
```bash
mkdir dashboard
cd dashboard
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install streamlit plotly pandas requests
```

2. `dashboard/app.py` 생성:
```python
import streamlit as st
import requests
import plotly.express as px
import pandas as pd

# Configuration
API_BASE_URL = "http://localhost:3000"

st.set_page_config(
    page_title="NDMarket AI Insights",
    page_icon="🧠",
    layout="wide",
)

st.title("🧠 NDMarket AI Insight Platform")
st.markdown("자연어로 데이터를 조회하고 인사이트를 얻으세요")

# Initialize session state
if 'history' not in st.session_state:
    st.session_state.history = []
```

3. 실행 스크립트:
```bash
streamlit run app.py
```

#### Acceptance Criteria
- [ ] Streamlit 앱 실행 성공
- [ ] NestJS API 연결 테스트
- [ ] 기본 레이아웃 구성 완료
- [ ] 브라우저에서 localhost:8501 접속 가능

---

### Task 4.2: 자연어 질의 인터페이스 구현

#### What & Why
사용자가 자연어로 질의를 입력하고 AI Agent에게 전달하는 UI를 구현합니다.

#### Tech Spec
- Streamlit chat interface
- NestJS `/agents/query` API 호출
- Loading states 및 error handling

#### How

1. `dashboard/app.py`에 질의 인터페이스 추가:
```python
import streamlit as st
import requests
import json

def query_agent(user_query: str) -> dict:
    """Call NestJS Agent API"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/agents/query",
            json={"query": user_query},
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API 호출 실패: {str(e)}")
        return None

# Chat interface
st.subheader("💬 질의하기")

with st.form(key="query_form"):
    user_input = st.text_input(
        "질문을 입력하세요",
        placeholder="예: 지난주 신규 입점 마켓 수는?"
    )
    submit_button = st.form_submit_button("분석하기")

if submit_button and user_input:
    with st.spinner("분석 중..."):
        result = query_agent(user_input)

        if result:
            # Add to history
            st.session_state.history.append({
                'query': user_input,
                'result': result
            })

            # Display results
            st.success("분석 완료!")

            # Show SQL
            with st.expander("생성된 SQL 쿼리"):
                st.code(result['generatedSQL'], language='sql')

            # Show summary
            st.markdown("### 📊 분석 결과")
            st.info(result['summary'])

            # Show insights
            if result.get('insights'):
                st.markdown("### 💡 주요 인사이트")
                for insight in result['insights']:
                    st.markdown(f"- {insight}")

            # Show execution time
            st.caption(f"실행 시간: {result['executionTime']}ms")
```

#### Acceptance Criteria
- [ ] 자연어 질의 입력 폼 작동
- [ ] NestJS Agent API 호출 성공
- [ ] SQL, 요약, 인사이트 표시
- [ ] Loading state 표시
- [ ] 에러 처리 구현

---

### Task 4.3: 데이터 시각화 컴포넌트 구현

#### What & Why
SQL 결과를 차트, 그래프, 테이블로 자동 시각화합니다.

#### Tech Spec
- Plotly for interactive charts
- Pandas for data manipulation
- Auto-chart selection based on data type

#### How

1. `dashboard/visualizer.py` 생성:
```python
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from typing import List, Dict, Any

def auto_visualize(data: List[Dict[str, Any]], query: str = ""):
    """Automatically select and create appropriate visualization"""
    if not data:
        return None

    df = pd.DataFrame(data)

    # Detect visualization type
    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
    categorical_cols = df.select_dtypes(include=['object']).columns

    # Bar chart for categorical + numeric
    if len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
        return create_bar_chart(df, categorical_cols[0], numeric_cols[0])

    # Line chart for time series
    if any('date' in col.lower() or 'time' in col.lower() for col in df.columns):
        time_col = next((col for col in df.columns if 'date' in col.lower() or 'time' in col.lower()), None)
        if time_col and len(numeric_cols) >= 1:
            return create_line_chart(df, time_col, numeric_cols[0])

    # Pie chart for counts
    if len(df) <= 10 and len(categorical_cols) >= 1:
        return create_pie_chart(df, categorical_cols[0])

    # Default: table
    return None

def create_bar_chart(df: pd.DataFrame, x_col: str, y_col: str):
    """Create interactive bar chart"""
    fig = px.bar(
        df,
        x=x_col,
        y=y_col,
        title=f"{y_col} by {x_col}",
        text=y_col,
    )
    fig.update_traces(texttemplate='%{text:.2s}', textposition='outside')
    fig.update_layout(uniformtext_minsize=8, uniformtext_mode='hide')
    return fig

def create_line_chart(df: pd.DataFrame, x_col: str, y_col: str):
    """Create interactive line chart"""
    fig = px.line(
        df,
        x=x_col,
        y=y_col,
        title=f"{y_col} over {x_col}",
        markers=True,
    )
    return fig

def create_pie_chart(df: pd.DataFrame, label_col: str):
    """Create pie chart for categorical distribution"""
    value_counts = df[label_col].value_counts()
    fig = px.pie(
        values=value_counts.values,
        names=value_counts.index,
        title=f"Distribution of {label_col}",
    )
    return fig
```

2. `app.py`에 시각화 추가:
```python
from visualizer import auto_visualize

# ... in query result display section

# Visualize data
if result.get('queryResults'):
    st.markdown("### 📈 시각화")

    fig = auto_visualize(result['queryResults'], user_input)
    if fig:
        st.plotly_chart(fig, use_container_width=True)
    else:
        # Fallback: show table
        df = pd.DataFrame(result['queryResults'])
        st.dataframe(df, use_container_width=True)
```

#### Acceptance Criteria
- [ ] Bar chart 자동 생성 (categorical + numeric)
- [ ] Line chart 자동 생성 (time series)
- [ ] Pie chart 자동 생성 (distribution)
- [ ] 데이터 테이블 표시 (fallback)
- [ ] 인터랙티브 차트 작동 (zoom, hover)

---

### Task 4.4: 질의 히스토리 및 즐겨찾기

#### What & Why
과거 질의를 저장하고 재실행할 수 있는 기능을 구현합니다.

#### Tech Spec
- Session state for history
- Local storage (optional)
- Rerun previous queries

#### How

1. `app.py`에 히스토리 사이드바 추가:
```python
# Sidebar for history
with st.sidebar:
    st.header("📜 질의 히스토리")

    if st.session_state.history:
        for idx, item in enumerate(reversed(st.session_state.history)):
            with st.expander(f"{idx + 1}. {item['query'][:30]}..."):
                st.caption(f"실행 시간: {item['result']['executionTime']}ms")
                st.code(item['result']['generatedSQL'], language='sql')

                if st.button(f"다시 실행", key=f"rerun_{idx}"):
                    # Rerun query
                    with st.spinner("재실행 중..."):
                        result = query_agent(item['query'])
                        if result:
                            st.rerun()
    else:
        st.info("아직 질의 히스토리가 없습니다")

    # Clear history
    if st.button("히스토리 삭제"):
        st.session_state.history = []
        st.rerun()
```

2. 즐겨찾기 기능 추가:
```python
# Add favorites to session state
if 'favorites' not in st.session_state:
    st.session_state.favorites = []

# In result display
col1, col2 = st.columns([3, 1])
with col1:
    st.info(result['summary'])
with col2:
    if st.button("⭐ 즐겨찾기"):
        st.session_state.favorites.append({
            'query': user_input,
            'result': result
        })
        st.success("즐겨찾기에 추가됨")

# Favorites in sidebar
with st.sidebar:
    st.header("⭐ 즐겨찾기")

    if st.session_state.favorites:
        for idx, fav in enumerate(st.session_state.favorites):
            if st.button(fav['query'][:30], key=f"fav_{idx}"):
                # Load favorite
                st.session_state.selected_favorite = fav
                st.rerun()
```

#### Acceptance Criteria
- [ ] 질의 히스토리 사이드바 표시
- [ ] 과거 질의 재실행 가능
- [ ] 즐겨찾기 추가/삭제 기능
- [ ] Session state로 데이터 유지
- [ ] 히스토리 삭제 버튼 작동

---

### Task 4.5: 실시간 메트릭 대시보드

#### What & Why
주요 비즈니스 메트릭을 실시간으로 모니터링하는 대시보드를 구현합니다.

#### Tech Spec
- Pre-defined metrics queries
- Auto-refresh (optional)
- KPI cards

#### How

1. `dashboard/metrics.py` 생성:
```python
import streamlit as st
import requests
from typing import Dict, Any

def fetch_metrics() -> Dict[str, Any]:
    """Fetch key business metrics"""
    metrics = {}

    # Total markets
    result = query_agent("전체 마켓 수는?")
    if result and result.get('queryResults'):
        metrics['total_markets'] = result['queryResults'][0].get('COUNT(*)', 0)

    # Total products
    result = query_agent("전체 상품 수는?")
    if result and result.get('queryResults'):
        metrics['total_products'] = result['queryResults'][0].get('COUNT(*)', 0)

    # New markets this week
    result = query_agent("이번 주 신규 마켓 수는?")
    if result and result.get('queryResults'):
        metrics['new_markets_week'] = result['queryResults'][0].get('COUNT(*)', 0)

    return metrics

def display_metrics_dashboard():
    """Display metrics as KPI cards"""
    st.header("📊 주요 지표")

    with st.spinner("메트릭 로딩 중..."):
        metrics = fetch_metrics()

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            label="전체 마켓",
            value=f"{metrics.get('total_markets', 0):,}",
        )

    with col2:
        st.metric(
            label="전체 상품",
            value=f"{metrics.get('total_products', 0):,}",
        )

    with col3:
        st.metric(
            label="이번 주 신규 마켓",
            value=f"{metrics.get('new_markets_week', 0):,}",
            delta="지난주 대비"
        )
```

2. `app.py`에 메트릭 대시보드 추가:
```python
from metrics import display_metrics_dashboard

# Add tab navigation
tab1, tab2 = st.tabs(["💬 질의하기", "📊 대시보드"])

with tab1:
    # Existing query interface
    ...

with tab2:
    display_metrics_dashboard()

    # Optional: Auto-refresh
    if st.checkbox("자동 새로고침 (30초)"):
        import time
        time.sleep(30)
        st.rerun()
```

#### Acceptance Criteria
- [ ] 주요 KPI 메트릭 표시 (마켓 수, 상품 수 등)
- [ ] Metric cards 스타일링
- [ ] 자동 새로고침 옵션 (선택적)
- [ ] 메트릭 로딩 상태 표시
- [ ] 탭 네비게이션 작동

---

### Task 4.6: 시맨틱 검색 UI 통합

#### What & Why
Vector Search 기능을 대시보드에 통합하여 상품 검색 UI를 제공합니다.

#### Tech Spec
- Semantic search API 호출
- Product card display
- Image placeholder

#### How

1. `dashboard/search.py` 생성:
```python
import streamlit as st
import requests

def semantic_search_ui():
    """Semantic search interface"""
    st.header("🔍 상품 검색")

    search_query = st.text_input(
        "찾고 싶은 상품을 설명하세요",
        placeholder="예: 여름용 시원한 소재의 남성 셔츠"
    )

    if search_query:
        with st.spinner("검색 중..."):
            response = requests.get(
                f"{API_BASE_URL}/search/semantic",
                params={"q": search_query, "k": 10}
            )

            if response.ok:
                results = response.json()

                st.write(f"**{len(results)}개의 상품을 찾았습니다**")

                # Display results in grid
                cols = st.columns(3)
                for idx, product in enumerate(results):
                    with cols[idx % 3]:
                        st.markdown(f"### {product['name']}")
                        st.caption(f"카테고리: {product['category']}")
                        st.caption(f"매장: {product['marketName']}")
                        st.caption(f"유사도: {product['score']:.2f}")
                        st.markdown(product['description'][:100] + "...")
                        st.divider()
```

2. `app.py`에 검색 탭 추가:
```python
from search import semantic_search_ui

tab1, tab2, tab3 = st.tabs(["💬 질의하기", "📊 대시보드", "🔍 상품 검색"])

with tab3:
    semantic_search_ui()
```

#### Acceptance Criteria
- [ ] 시맨틱 검색 입력 UI
- [ ] 검색 결과 카드 형식으로 표시
- [ ] 유사도 스코어 표시
- [ ] 그리드 레이아웃 (3열)
- [ ] GET `/search/semantic` API 연동

---

## ✅ Phase 완료 기준

- [ ] Streamlit 대시보드 실행 가능
- [ ] 자연어 질의 인터페이스 작동
- [ ] AI Agent API 연동 성공
- [ ] 데이터 자동 시각화 (bar, line, pie chart)
- [ ] 질의 히스토리 및 재실행 기능
- [ ] 즐겨찾기 기능 구현
- [ ] 실시간 메트릭 대시보드
- [ ] 시맨틱 검색 UI 통합
- [ ] 로딩 상태 및 에러 처리
- [ ] 반응형 레이아웃 (3열 그리드)

## 🚀 다음 단계

Phase 4 완료 후 [Phase 5: Infrastructure](./05-Infrastructure.md)로 진행하여 Terraform 기반 인프라 자동화 및 CI/CD 파이프라인을 구축합니다.
