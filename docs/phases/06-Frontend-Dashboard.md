# Phase 6: Frontend Dashboard & Data Visualization

**목표**: React/Next.js 기반 데이터 인사이트 대시보드 구현 및 MySQL MCP 직접 연동

**의존성**: Phase 1 (Foundation), Phase 2 (Agent System)

**예상 기간**: 6일

---

## What & Why

### 배경
- NDMarket의 판매, 상품, 고객 데이터를 시각적으로 분석할 수 있는 대시보드 필요
- 자연어로 데이터를 요청하면 AI가 SQL을 생성하고, 결과를 차트/테이블로 시각화
- MySQL MCP를 통해 Claude가 직접 데이터베이스를 쿼리하고 인사이트 도출

### 핵심 기능
1. **자연어 → 데이터 시각화 파이프라인**
   - 사용자가 "최근 1주일 매출 추이를 보여줘" 입력
   - Backend AI가 SQL 생성 및 실행
   - Frontend가 결과를 Line Chart로 시각화

2. **다양한 차트 타입 지원**
   - Line Chart (시계열 추이)
   - Bar Chart (카테고리별 비교)
   - Pie Chart (비율 분석)
   - Table (Raw 데이터 확인)
   - Heatmap (상관관계 분석)

3. **MySQL MCP 활용 인사이트**
   - Claude가 MySQL MCP로 직접 데이터 조회
   - 이상치 탐지, 트렌드 분석, 예측 인사이트 제공
   - 자동 보고서 생성

4. **실시간 대시보드**
   - WebSocket/SSE로 실시간 데이터 업데이트
   - 커스텀 대시보드 위젯 구성
   - 즐겨찾기 쿼리 저장 및 자동 실행

---

## Tech Spec

### Frontend Stack
```yaml
framework: "Next.js 14+ (App Router)"
ui_library: "shadcn/ui + Tailwind CSS"
state_management: "Zustand or TanStack Query"
charts: "Recharts + Chart.js"
tables: "TanStack Table"
forms: "React Hook Form + Zod"
websocket: "Socket.io-client"
```

### Backend Integration
```yaml
api_client: "Axios with interceptors"
authentication: "JWT tokens from NestJS backend"
real_time: "Socket.io or Server-Sent Events"
file_upload: "Multipart form data for CSV import"
```

### MySQL MCP 활용 방안
```yaml
direct_query: "Claude가 MCP로 DB 직접 쿼리"
insight_generation: "데이터 기반 자동 인사이트 생성"
anomaly_detection: "이상치 자동 탐지 및 알림"
report_automation: "주간/월간 리포트 자동 생성"
```

### 데이터 시각화 전략

#### 1. Chart Type 매칭 로직
```typescript
// AI가 SQL 결과 구조를 분석하여 최적의 차트 타입 제안
interface ChartRecommendation {
  type: 'line' | 'bar' | 'pie' | 'table' | 'heatmap';
  reason: string;
  config: ChartConfig;
}

// 예시: 시계열 데이터 → Line Chart
// 카테고리별 합계 → Bar Chart
// 비율 데이터 → Pie Chart
```

#### 2. 반응형 차트 컴포넌트
```typescript
// 모든 차트는 responsive + interactive
// Tooltip, Legend, Zoom, Export 기본 지원
<ResponsiveLineChart
  data={queryResult}
  xKey="date"
  yKey="sales"
  tooltip={true}
  zoom={true}
  export={true}
/>
```

#### 3. 데이터 변환 파이프라인
```
Raw SQL Result
  ↓
Data Transformer (정규화, 집계)
  ↓
Chart Config Generator
  ↓
Recharts Component
  ↓
Interactive Visualization
```

---

## How (Implementation Guide)

### Task 6.1: Next.js 프론트엔드 프로젝트 설정

**목표**: Next.js 14 App Router 프로젝트 생성 및 기본 구조 설정

**구현 단계**:
```bash
# 1. Next.js 프로젝트 생성
npx create-next-app@latest datamind-frontend --typescript --tailwind --app

# 2. 필수 라이브러리 설치
pnpm add zustand axios recharts @tanstack/react-table
pnpm add @tanstack/react-query socket.io-client
pnpm add react-hook-form zod @hookform/resolvers
pnpm add lucide-react class-variance-authority clsx tailwind-merge

# 3. shadcn/ui 초기화
npx shadcn-ui@latest init
```

**파일 구조**:
```
datamind-frontend/
├── app/
│   ├── (dashboard)/          # Dashboard layout group
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Main dashboard
│   │   ├── insights/         # AI Insights page
│   │   └── history/          # Query history
│   ├── api/                  # API routes (optional)
│   └── layout.tsx
├── components/
│   ├── charts/               # Chart components
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   └── DataTable.tsx
│   ├── dashboard/            # Dashboard widgets
│   │   ├── QueryInput.tsx
│   │   ├── VisualizationPanel.tsx
│   │   └── InsightCard.tsx
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── api/                  # API client
│   │   ├── query-client.ts
│   │   └── websocket.ts
│   ├── stores/               # Zustand stores
│   │   └── dashboard-store.ts
│   └── utils/
│       ├── chart-mapper.ts   # SQL result → Chart config
│       └── data-transformer.ts
└── types/
    ├── query.ts
    └── chart.ts
```

**환경 변수**:

개발 환경 (`frontend/.env.development`):
```env
# Vite Dev Server(5173)에서 프록시를 통해 백엔드(3000)로 요청
VITE_API_URL=http://localhost:3000
```

프로덕션 환경 (`frontend/.env.production`):
```env
# 빌드된 정적 파일이 NestJS(3000)에서 서빙되므로 같은 포트 사용
VITE_API_URL=http://localhost:3000
```

**Vite 프록시 설정** (`frontend/vite.config.ts`):
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/agent': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/search': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
    '/indexing': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

**포트 운영 방식**:
- **개발 모드**: 백엔드(3000) + 프론트엔드(5173) 별도 실행
- **프로덕션 모드**: 통합 포트(3000)에서 백엔드 + 프론트엔드 제공

**Acceptance Criteria**:
- [ ] Next.js 14 App Router 프로젝트 생성 완료
- [ ] shadcn/ui 및 Tailwind CSS 설정 완료
- [ ] 기본 레이아웃 및 라우팅 구조 구현
- [ ] API 클라이언트 및 상태 관리 설정
- [ ] TypeScript 타입 정의 완료

---

### Task 6.2: 자연어 쿼리 인터페이스 구현

**목표**: 사용자가 자연어로 데이터를 요청할 수 있는 인터페이스 구현

**구현 단계**:

**1. QueryInput 컴포넌트**
```typescript
// components/dashboard/QueryInput.tsx
interface QueryInputProps {
  onSubmit: (query: string) => Promise<void>;
  isLoading: boolean;
}

export function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(query);
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 최근 일주일간 가장 많이 팔린 상품 10개를 보여줘"
          className="flex-1"
          rows={3}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          분석하기
        </Button>
      </div>
    </form>
  );
}
```

**2. API Client 구현**
```typescript
// lib/api/query-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  sql: string;
  data: unknown[];
  executionTime: number;
  rowCount: number;
  timestamp: string;
  chartRecommendation?: ChartRecommendation;
}

export async function submitQuery(query: string): Promise<QueryResponse> {
  const { data } = await apiClient.post<QueryResponse>('/query', { query });
  return data;
}
```

**3. 예시 쿼리 템플릿**
```typescript
// components/dashboard/QueryTemplates.tsx
const templates = [
  "최근 일주일간 일별 매출 추이를 보여줘",
  "지난 달 가장 많이 팔린 상품 TOP 10",
  "고객 연령대별 구매 패턴 분석",
  "지역별 매출 비교",
  "상품 카테고리별 수익률",
];

export function QueryTemplates({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {templates.map((template) => (
        <Button
          key={template}
          variant="outline"
          onClick={() => onSelect(template)}
        >
          {template}
        </Button>
      ))}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] 자연어 쿼리 입력 UI 구현
- [ ] Backend API와 연동하여 쿼리 전송
- [ ] 로딩 상태 및 에러 처리
- [ ] 예시 쿼리 템플릿 제공
- [ ] 쿼리 히스토리 저장 및 재사용

---

### Task 6.3: 데이터 시각화 컴포넌트 구현

**목표**: 다양한 차트 타입 컴포넌트 구현 및 자동 매칭 로직

**구현 단계**:

**1. Chart Type Mapper**
```typescript
// lib/utils/chart-mapper.ts
export interface ChartRecommendation {
  type: 'line' | 'bar' | 'pie' | 'table' | 'heatmap';
  reason: string;
  config: {
    xKey?: string;
    yKey?: string | string[];
    labelKey?: string;
    valueKey?: string;
  };
}

export function recommendChartType(data: unknown[]): ChartRecommendation {
  if (!data || data.length === 0) {
    return { type: 'table', reason: 'No data available', config: {} };
  }

  const firstRow = data[0] as Record<string, unknown>;
  const keys = Object.keys(firstRow);

  // 시계열 데이터 감지 (date, created_at, timestamp 등)
  const hasTimeColumn = keys.some(k =>
    /date|time|created|updated/i.test(k)
  );

  // 숫자형 컬럼 감지
  const numericColumns = keys.filter(k =>
    typeof firstRow[k] === 'number'
  );

  // 시계열 + 숫자 → Line Chart
  if (hasTimeColumn && numericColumns.length > 0) {
    const timeKey = keys.find(k => /date|time/i.test(k))!;
    return {
      type: 'line',
      reason: 'Time-series data detected',
      config: {
        xKey: timeKey,
        yKey: numericColumns[0],
      },
    };
  }

  // 카테고리 + 숫자 → Bar Chart
  if (keys.length === 2 && numericColumns.length === 1) {
    const categoryKey = keys.find(k => !numericColumns.includes(k))!;
    return {
      type: 'bar',
      reason: 'Category vs numeric comparison',
      config: {
        xKey: categoryKey,
        yKey: numericColumns[0],
      },
    };
  }

  // 비율 데이터 (percentage, ratio) → Pie Chart
  if (data.length <= 10 && numericColumns.some(k => /(percent|ratio|rate)/i.test(k))) {
    return {
      type: 'pie',
      reason: 'Percentage/ratio data with few categories',
      config: {
        labelKey: keys[0],
        valueKey: numericColumns[0],
      },
    };
  }

  // 기본: Table
  return {
    type: 'table',
    reason: 'Default fallback for complex data',
    config: {},
  };
}
```

**2. Recharts 컴포넌트**
```typescript
// components/charts/ResponsiveLineChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  data: unknown[];
  xKey: string;
  yKey: string;
  title?: string;
}

export function ResponsiveLineChart({ data, xKey, yKey, title }: Props) {
  return (
    <div className="w-full h-[400px]">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#8884d8"
            strokeWidth={2}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**3. Chart Selector 컴포넌트**
```typescript
// components/charts/ChartSelector.tsx
export function ChartSelector({
  data,
  recommendation
}: {
  data: unknown[];
  recommendation: ChartRecommendation;
}) {
  const [chartType, setChartType] = useState(recommendation.type);

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return <ResponsiveLineChart data={data} {...recommendation.config} />;
      case 'bar':
        return <ResponsiveBarChart data={data} {...recommendation.config} />;
      case 'pie':
        return <ResponsivePieChart data={data} {...recommendation.config} />;
      case 'table':
        return <DataTable data={data} />;
      default:
        return <DataTable data={data} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>데이터 시각화</CardTitle>
          <div className="flex gap-2">
            {['line', 'bar', 'pie', 'table'].map((type) => (
              <Button
                key={type}
                variant={chartType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType(type as ChartType)}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {recommendation.reason}
        </p>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}
```

**4. TanStack Table 구현**
```typescript
// components/charts/DataTable.tsx
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';

export function DataTable({ data }: { data: unknown[] }) {
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0] as object).map((key) => ({
      accessorKey: key,
      header: key.toUpperCase(),
    }));
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Line, Bar, Pie, Table 차트 컴포넌트 구현
- [ ] Chart Type 자동 추천 로직 구현
- [ ] 사용자가 차트 타입 수동 변경 가능
- [ ] 반응형 디자인 (모바일/태블릿 지원)
- [ ] 차트 내보내기 기능 (PNG, CSV)

---

### Task 6.4: 대시보드 레이아웃 및 위젯 시스템

**목표**: 커스터마이징 가능한 대시보드 레이아웃 구현

**구현 단계**:

**1. Dashboard Store (Zustand)**
```typescript
// lib/stores/dashboard-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Widget {
  id: string;
  title: string;
  query: string;
  chartType: ChartType;
  data: unknown[];
  position: { x: number; y: number; w: number; h: number };
}

interface DashboardStore {
  widgets: Widget[];
  addWidget: (widget: Widget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  reorderWidgets: (widgets: Widget[]) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      widgets: [],
      addWidget: (widget) =>
        set((state) => ({ widgets: [...state.widgets, widget] })),
      removeWidget: (id) =>
        set((state) => ({ widgets: state.widgets.filter(w => w.id !== id) })),
      updateWidget: (id, updates) =>
        set((state) => ({
          widgets: state.widgets.map(w =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),
      reorderWidgets: (widgets) => set({ widgets }),
    }),
    { name: 'dashboard-storage' }
  )
);
```

**2. Grid Layout**
```typescript
// components/dashboard/DashboardGrid.tsx
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

export function DashboardGrid() {
  const { widgets, reorderWidgets } = useDashboardStore();

  const layouts = {
    lg: widgets.map(w => ({
      i: w.id,
      x: w.position.x,
      y: w.position.y,
      w: w.position.w,
      h: w.position.h,
    })),
  };

  const handleLayoutChange = (newLayout: Layout[]) => {
    const updatedWidgets = widgets.map(widget => {
      const layout = newLayout.find(l => l.i === widget.id);
      return layout ? {
        ...widget,
        position: { x: layout.x, y: layout.y, w: layout.w, h: layout.h },
      } : widget;
    });
    reorderWidgets(updatedWidgets);
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={100}
      onLayoutChange={handleLayoutChange}
      isDraggable
      isResizable
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="widget-container">
          <WidgetCard widget={widget} />
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
```

**3. Widget Card**
```typescript
// components/dashboard/WidgetCard.tsx
export function WidgetCard({ widget }: { widget: Widget }) {
  const { removeWidget } = useDashboardStore();

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {/* refresh */}}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => removeWidget(widget.id)}>
              <Trash className="mr-2 h-4 w-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="h-[calc(100%-60px)]">
        <ChartSelector data={widget.data} chartType={widget.chartType} />
      </CardContent>
    </Card>
  );
}
```

**Acceptance Criteria**:
- [ ] 드래그 앤 드롭으로 위젯 배치 가능
- [ ] 위젯 크기 조절 가능
- [ ] 위젯 추가/삭제 기능
- [ ] 대시보드 레이아웃 localStorage에 저장
- [ ] 반응형 그리드 레이아웃

---

### Task 6.5: 실시간 데이터 업데이트 (WebSocket)

**목표**: WebSocket/SSE를 통한 실시간 데이터 업데이트

**구현 단계**:

**1. Socket.io Client**
```typescript
// lib/api/websocket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectWebSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  }

  return socket;
}

export function subscribeToQuery(queryId: string, callback: (data: unknown) => void) {
  const ws = connectWebSocket();
  ws.on(`query:${queryId}`, callback);

  return () => {
    ws.off(`query:${queryId}`, callback);
  };
}
```

**2. Real-time Widget**
```typescript
// components/dashboard/RealTimeWidget.tsx
export function RealTimeWidget({ queryId, query }: { queryId: string; query: string }) {
  const [data, setData] = useState<unknown[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToQuery(queryId, (newData) => {
      setData(newData as unknown[]);
    });

    return unsubscribe;
  }, [queryId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          실시간 모니터링
        </CardTitle>
        <CardDescription>{query}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveLineChart data={data} xKey="timestamp" yKey="value" />
      </CardContent>
    </Card>
  );
}
```

**3. Backend WebSocket Handler** (NestJS)
```typescript
// src/modules/query/query.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class QueryGateway {
  @WebSocketServer()
  server: Server;

  emitQueryUpdate(queryId: string, data: unknown) {
    this.server.emit(`query:${queryId}`, data);
  }
}
```

**Acceptance Criteria**:
- [ ] WebSocket 연결 관리
- [ ] 실시간 데이터 업데이트 수신
- [ ] 재연결 로직 구현
- [ ] 실시간 차트 업데이트
- [ ] 연결 상태 표시

---

### Task 6.6: MySQL MCP 통합 및 AI Insights

**목표**: MySQL MCP를 활용하여 Claude가 직접 데이터베이스 인사이트 도출

**MySQL MCP 활용 시나리오**:

**1. 자동 인사이트 생성**
```typescript
// lib/ai/insight-generator.ts
interface InsightRequest {
  userQuery: string;
  queryResult: unknown[];
}

interface InsightResponse {
  insights: string[];        // AI가 도출한 인사이트
  anomalies: Anomaly[];     // 이상치 탐지
  recommendations: string[]; // 추천 액션
  relatedQueries: string[]; // 관련 쿼리 제안
}

export async function generateInsights(
  request: InsightRequest
): Promise<InsightResponse> {
  // Backend에서 MySQL MCP를 통해 Claude가 직접 데이터 분석
  const response = await apiClient.post<InsightResponse>(
    '/insights/generate',
    request
  );
  return response.data;
}
```

**2. Insight Panel 컴포넌트**
```typescript
// components/dashboard/InsightPanel.tsx
export function InsightPanel({ queryResult }: { queryResult: QueryResponse }) {
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const result = await generateInsights({
        userQuery: queryResult.sql,
        queryResult: queryResult.data,
      });
      setInsights(result);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Insights
          </CardTitle>
          <Button
            onClick={loadInsights}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            분석하기
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights?.insights.map((insight, i) => (
          <Alert key={i}>
            <LightbulbIcon className="h-4 w-4" />
            <AlertDescription>{insight}</AlertDescription>
          </Alert>
        ))}

        {insights?.anomalies && insights.anomalies.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              이상치 탐지
            </h4>
            {insights.anomalies.map((anomaly, i) => (
              <Alert key={i} variant="destructive">
                <AlertDescription>{anomaly.description}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {insights?.recommendations && (
          <div>
            <h4 className="font-semibold mb-2">추천 액션</h4>
            <ul className="list-disc list-inside space-y-1">
              {insights.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground">{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {insights?.relatedQueries && (
          <div>
            <h4 className="font-semibold mb-2">관련 쿼리</h4>
            <div className="flex flex-wrap gap-2">
              {insights.relatedQueries.map((query, i) => (
                <Badge key={i} variant="outline" className="cursor-pointer">
                  {query}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**3. Backend Insight Service** (NestJS + MySQL MCP)
```typescript
// src/modules/insights/insights.service.ts
import { Injectable } from '@nestjs/common';
import { BedrockService } from '@/common/bedrock.service';

@Injectable()
export class InsightsService {
  constructor(private readonly bedrockService: BedrockService) {}

  async generateInsights(
    userQuery: string,
    queryResult: unknown[]
  ): Promise<InsightResponse> {
    // MySQL MCP를 통해 Claude가 직접 DB 조회 및 분석
    const systemPrompt = `You are a data analyst with access to MySQL database.

Available Tools:
- MySQL MCP: You can directly query the database using mysql_query tool
- You have access to the original user query and its results

Your task:
1. Analyze the query results
2. Use MySQL MCP to query additional data if needed for deeper insights
3. Detect anomalies or unusual patterns
4. Provide actionable recommendations
5. Suggest related queries that might be interesting

User Query: ${userQuery}
Query Results: ${JSON.stringify(queryResult, null, 2)}

Provide insights in this JSON format:
{
  "insights": ["insight 1", "insight 2", ...],
  "anomalies": [{ "description": "...", "severity": "high|medium|low" }],
  "recommendations": ["recommendation 1", ...],
  "relatedQueries": ["query 1", "query 2", ...]
}`;

    const response = await this.bedrockService.invokeModel(
      [
        {
          role: 'user',
          content: 'Analyze the data and provide insights using MySQL MCP if needed.',
        },
      ],
      {
        system: systemPrompt,
        max_tokens: 4096,
        temperature: 0.7,
      }
    );

    // Parse JSON response
    const insights = JSON.parse(response.content[0].text);
    return insights;
  }
}
```

**MySQL MCP 인사이트 예시**:
```
User Query: "최근 일주일 매출 추이를 보여줘"

AI Insights (MySQL MCP 활용):
1. "지난 주 목요일(11월 14일) 매출이 평균 대비 35% 급증했습니다."
   → MCP로 과거 데이터 조회: SELECT AVG(sales) FROM daily_sales WHERE ...

2. "상품 카테고리 중 '전자제품'의 매출 비중이 최근 3일간 20%에서 35%로 증가했습니다."
   → MCP로 카테고리별 분석: SELECT category, SUM(amount) FROM ...

3. "신규 고객의 구매 전환율이 전주 대비 12% 하락했습니다. 프로모션 재검토가 필요합니다."
   → MCP로 고객 세그먼트 분석

Anomalies:
- "11월 16일 23시경 일시적으로 주문 취소율이 45%로 급증 (평균 5%)"
  → MySQL MCP로 해당 시간대 데이터 직접 조회 및 원인 분석

Recommendations:
- "목요일 저녁 시간대에 타겟 마케팅 강화 권장"
- "전자제품 카테고리 재고 확보 필요"

Related Queries:
- "11월 14일 목요일에 어떤 상품이 가장 많이 팔렸나요?"
- "신규 고객의 평균 구매 금액은 얼마인가요?"
```

**Acceptance Criteria**:
- [ ] MySQL MCP를 통한 직접 DB 쿼리 기능
- [ ] AI가 자동으로 인사이트 도출
- [ ] 이상치 탐지 및 알림
- [ ] 추천 액션 제공
- [ ] 관련 쿼리 자동 제안

---

## Phase 6 완료 조건

- [ ] Next.js 프론트엔드 프로젝트 완성
- [ ] 자연어 쿼리 → 차트 시각화 파이프라인 구현
- [ ] Line, Bar, Pie, Table 차트 모두 작동
- [ ] 커스텀 대시보드 위젯 시스템 구현
- [ ] 실시간 데이터 업데이트 (WebSocket)
- [ ] MySQL MCP 기반 AI Insights 기능
- [ ] 반응형 디자인 (모바일/태블릿/데스크톱)
- [ ] 성능 최적화 (React Query 캐싱, 코드 스플리팅)

---

## 성능 최적화 전략

### 1. React Query 캐싱
```typescript
// lib/queries/use-query-data.ts
import { useQuery } from '@tanstack/react-query';

export function useQueryData(query: string) {
  return useQuery({
    queryKey: ['query', query],
    queryFn: () => submitQuery(query),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    cacheTime: 10 * 60 * 1000, // 10분간 메모리 보관
  });
}
```

### 2. 차트 컴포넌트 Lazy Loading
```typescript
// app/(dashboard)/page.tsx
import dynamic from 'next/dynamic';

const LineChart = dynamic(() => import('@/components/charts/LineChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### 3. 데이터 Pagination
```typescript
// 큰 데이터셋은 페이지네이션 또는 가상 스크롤 적용
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## 보안 고려사항

1. **API 인증**: JWT 토큰 기반 인증
2. **XSS 방어**: DOMPurify로 사용자 입력 sanitize
3. **CORS 설정**: Next.js API routes에서 CORS 제어
4. **Rate Limiting**: API 요청 제한 (1분당 10회)
5. **SQL Injection**: Backend에서 이미 방어됨

---

## 배포 전략

### Vercel 배포
```bash
# 1. Vercel CLI 설치
pnpm add -g vercel

# 2. 프로젝트 연결
vercel link

# 3. 환경 변수 설정
vercel env add NEXT_PUBLIC_API_URL production

# 4. 배포
vercel --prod
```

### 환경 변수
```env
# Production
NEXT_PUBLIC_API_URL=https://api.datamind.com
NEXT_PUBLIC_WS_URL=wss://api.datamind.com

# Staging
NEXT_PUBLIC_API_URL=https://staging-api.datamind.com
NEXT_PUBLIC_WS_URL=wss://staging-api.datamind.com
```
