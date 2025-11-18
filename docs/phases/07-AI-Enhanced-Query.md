# Phase 7: AI-Enhanced Query Experience

**목표**: LLM 기반 지능형 질의 분석 및 풍부한 인사이트 제공

**의존성**: Phase 1 (Foundation), Phase 2 (Agent System), Phase 6 (Frontend Dashboard)

**예상 기간**: 6일

---

## What & Why

### 배경
- 사용자가 불완전한 질의를 입력할 때 AI가 자동으로 감지하고 추가 질문을 생성
- 데이터 특성에 따라 AI가 최적의 시각화 방법을 자동으로 추천
- 단순한 결과 제공이 아닌 풍부한 인사이트와 대화형 UI로 사용자 경험 향상
- 프롬프트 엔지니어링을 통한 구조화된 JSON 응답으로 일관성 있는 결과 보장

### 핵심 기능

#### 1. 질의 분석 및 추가 질문
**문제점**: 사용자가 "가장 많이 팔린 상품은?" 같은 모호한 질문을 입력
**해결책**: AI가 자동으로 불충분함을 감지하고 구조화된 추가 질문 생성

**예시 플로우**:
```
사용자: "가장 많이 팔린 상품은?"
  ↓
AI 분석: "기간과 개수가 명시되지 않음"
  ↓
추가 질문 모달:
  Q1: 어떤 기간? [오늘, 이번 주, 이번 달, 최근 30일, 올해]
  Q2: 상위 몇 개? [1개, 3개, 5개, 10개]
  ↓
사용자 선택: "최근 30일, 10개"
  ↓
재질의: "가장 많이 팔린 상품은? (최근 30일, 10개)"
  ↓
SQL 생성 및 실행
```

#### 2. AI 자동 시각화 선택
**문제점**: 개발자가 수동으로 차트 타입을 결정해야 함
**해결책**: LLM이 데이터 특성을 분석하여 최적의 시각화 방법 추천

**시각화 옵션**:
- `chart`: Bar/Line/Pie 차트만 표시
- `table`: 테이블만 표시
- `both`: 차트 + 테이블 함께 표시

**AI 판단 기준**:
```typescript
// 시계열 데이터 → Line Chart
// 카테고리 비교 → Bar Chart
// 소수 항목 비율 → Pie Chart
// 복잡한 다차원 데이터 → Table
// 시각적 + 상세 필요 → Both
```

#### 3. 풍부한 AI 인사이트 (6가지 유형)

**인사이트 구조**:
```typescript
{
  summary: "전체 결과를 1-2문장으로 요약",
  keyFindings: [
    "⭐ 핵심 발견사항 1 (이모지 포함)",
    "📈 핵심 발견사항 2",
    "🕐 핵심 발견사항 3",
    "💡 핵심 발견사항 4"
  ],
  comparison: "비교 분석 (예: 1위와 10위의 격차)",
  trend: "트렌드 분석 (예: 계절성, 성장 추세)",
  anomaly: "⚠️ 이상치/특이사항",
  recommendation: "💡 추천 사항 (실행 가능한 액션)"
}
```

**실제 예시**:
```json
{
  "summary": "최근 30일간 상위 10개 상품의 총 판매량은 15,234개로, 전체 매출의 62%를 차지합니다.",
  "keyFindings": [
    "⭐ 베스트셀러 1위는 '프리미엄 무선 이어폰'으로 2,456개 판매되었습니다",
    "📈 주말 매출이 평일 대비 35% 높은 패턴을 보입니다",
    "🕐 오후 8시~10시 사이 주문이 전체의 40%를 차지합니다",
    "💡 상위 5개 상품이 전체 매출의 48%를 차지하며 집중도가 높습니다"
  ],
  "comparison": "1위 상품과 10위 상품의 판매량 격차는 약 2.3배입니다",
  "trend": "계절성 상품(여름용품)이 상위권에 진입하기 시작했습니다",
  "anomaly": "⚠️ 3위 상품의 판매량이 전주 대비 127% 급증했습니다 (프로모션 영향 추정)",
  "recommendation": "💡 인기 상품 라인업 확대 및 번들 상품 구성을 고려하세요"
}
```

#### 4. 이모지 포함 대화형 UI
**화려하고 직관적인 UI**:
- 인사이트 섹션마다 컬러풀한 배경 (gradient)
- 이모지로 시각적 강조 (⭐, 📈, 🕐, 💡, ⚠️)
- 추가 질문 모달: 드롭다운 선택 UI
- Smooth 애니메이션 및 반응형 디자인

---

## Tech Spec

### Backend Enhancement
```yaml
llm: "AWS Bedrock Claude 3.5 Sonnet"
model_id: "anthropic.claude-3-5-sonnet-20240620-v1:0"
prompt_engineering: "Structured JSON output with schema validation"
services:
  - BedrockService (3 new methods)
  - QueryService (enhanced pipeline)
dtos:
  - VisualizationDto
  - InsightsDto
  - ClarifyingQuestionDto
  - QueryResponseDto (enhanced)
```

### Frontend Enhancement
```yaml
framework: "React 18 + TypeScript + Vite"
ui: "Tailwind CSS 4.x"
state: "TanStack Query (React Query)"
charts: "Recharts (Bar, Line, Pie)"
components:
  - ClarifyingQuestions Modal
  - Rich Insights Display
  - Auto Chart Type Selection
```

### Prompt Templates
```yaml
query_analysis: "src/prompts/query-analysis.prompt.ts"
insight_generation: "src/prompts/insight-generation.prompt.ts"
visualization_selection: "src/prompts/visualization-selection.prompt.ts"
```

### AI Pipeline
```
User Query
  ↓
[Step 1] analyzeQuery() → 질의 분석 (추가 질문 필요 여부)
  ↓
[Step 2] generateSQL() → SQL 생성 (Text-to-SQL)
  ↓
[Step 3] validateSQL() → SQL 검증 (안전성 체크)
  ↓
[Step 4] executeSQL() → MySQL 실행
  ↓
[Step 5] Parallel:
  - generateInsights() → 6가지 인사이트 생성
  - selectVisualization() → 시각화 방법 선택
  ↓
Enhanced Response (with insights + visualization)
```

---

## How (Implementation Guide)

### Task 7.1: 구조화된 응답 DTO 설계

**목표**: Phase 7에서 필요한 새로운 DTO 클래스 설계 및 구현

**구현 단계**:

**1. VisualizationDto**
```typescript
// src/modules/query/dto/visualization.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class VisualizationDto {
  @ApiProperty({
    enum: ['chart', 'table', 'both'],
    description: '시각화 타입',
  })
  type: 'chart' | 'table' | 'both';

  @ApiProperty({
    enum: ['bar', 'line', 'pie'],
    required: false,
    description: '차트 타입 (chart 또는 both일 때)',
  })
  chartType?: 'bar' | 'line' | 'pie';

  @ApiProperty({ description: 'AI 추천 이유' })
  reason: string;
}
```

**2. InsightsDto**
```typescript
// src/modules/query/dto/insights.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class InsightsDto {
  @ApiProperty({ description: '전체 결과 요약' })
  summary: string;

  @ApiProperty({
    type: [String],
    description: '핵심 발견사항 (이모지 포함)',
  })
  keyFindings: string[];

  @ApiProperty({
    required: false,
    description: '비교 분석',
  })
  comparison?: string;

  @ApiProperty({
    required: false,
    description: '트렌드 분석',
  })
  trend?: string;

  @ApiProperty({
    required: false,
    description: '이상치/특이사항',
  })
  anomaly?: string;

  @ApiProperty({
    required: false,
    description: '추천 사항',
  })
  recommendation?: string;
}
```

**3. ClarifyingQuestionDto**
```typescript
// src/modules/query/dto/clarifying-question.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ClarifyingQuestionItemDto {
  @ApiProperty({
    enum: ['period', 'limit', 'filter', 'grouping'],
    description: '질문 타입',
  })
  type: 'period' | 'limit' | 'filter' | 'grouping';

  @ApiProperty({ description: '질문 내용' })
  question: string;

  @ApiProperty({
    type: [String],
    description: '선택 가능한 옵션들',
  })
  options: string[];

  @ApiProperty({ description: '기본 선택값' })
  default: string;
}

export class ClarifyingQuestionsDto {
  @ApiProperty({ description: '추가 질문이 필요한 이유' })
  reason: string;

  @ApiProperty({
    type: [ClarifyingQuestionItemDto],
    description: '추가 질문 목록',
  })
  questions: ClarifyingQuestionItemDto[];
}
```

**4. Enhanced QueryResponseDto**
```typescript
// src/modules/query/dto/query-response.dto.ts (수정)
import { ApiProperty } from '@nestjs/swagger';
import { ClarifyingQuestionsDto } from './clarifying-question.dto';
import { InsightsDto } from './insights.dto';
import { VisualizationDto } from './visualization.dto';

export class QueryResponseDto {
  @ApiProperty({ description: '사용자 질의' })
  query: string;

  @ApiProperty({ description: '생성된 SQL' })
  sql: string;

  @ApiProperty({ description: '쿼리 결과' })
  results: unknown[];

  @ApiProperty({ description: '실행 시간 (ms)' })
  executionTime: number;

  @ApiProperty({ description: '결과 행 개수' })
  rowCount: number;

  @ApiProperty({ description: '타임스탬프' })
  timestamp: string;

  @ApiProperty({
    type: VisualizationDto,
    description: 'AI 시각화 추천',
  })
  visualization: VisualizationDto;

  @ApiProperty({
    type: InsightsDto,
    description: 'AI 인사이트',
  })
  insights: InsightsDto;

  @ApiProperty({
    type: ClarifyingQuestionsDto,
    required: false,
    description: '추가 질문 (선택적)',
  })
  clarifyingQuestions?: ClarifyingQuestionsDto;

  constructor(partial: Partial<QueryResponseDto>) {
    Object.assign(this, partial);
  }
}
```

**Acceptance Criteria**:
- [x] VisualizationDto 구현 완료
- [x] InsightsDto 구현 완료
- [x] ClarifyingQuestionDto 구현 완료
- [x] QueryResponseDto 업데이트 완료
- [x] Swagger API 문서 자동 생성 확인

---

### Task 7.2: 프롬프트 템플릿 작성

**목표**: LLM에게 전달할 구조화된 프롬프트 템플릿 작성

**구현 단계**:

**1. 질의 분석 프롬프트**
```typescript
// src/prompts/query-analysis.prompt.ts
export function buildQueryAnalysisPrompt(userQuery: string): {
  system: string;
  user: string;
} {
  const system = `You are a query analysis specialist.

Your task:
- Analyze user queries to determine if they are complete and unambiguous
- Detect missing critical information: time period, limit count, filters, grouping
- Generate clarifying questions if needed

Response format (JSON only):
{
  "needsClarification": boolean,
  "reason": "string (if true)",
  "questions": [
    {
      "type": "period|limit|filter|grouping",
      "question": "string",
      "options": ["option1", "option2", ...],
      "default": "string"
    }
  ]
}

Examples:
User: "가장 많이 팔린 상품은?"
→ Missing: period, limit
→ needsClarification: true

User: "최근 30일간 가장 많이 팔린 상품 Top 10은?"
→ Complete
→ needsClarification: false`;

  const user = `Analyze this query:
"${userQuery}"

Respond in JSON format only.`;

  return { system, user };
}
```

**2. 인사이트 생성 프롬프트**
```typescript
// src/prompts/insight-generation.prompt.ts
export function buildInsightGenerationPrompt(
  userQuery: string,
  sqlQuery: string,
  queryResults: unknown[]
): { system: string; user: string } {
  const system = `You are a data insights specialist.

Your task:
- Analyze query results and generate rich, actionable insights
- Use emojis to make insights visually appealing
- Provide 6 types of insights: summary, keyFindings, comparison, trend, anomaly, recommendation

Response format (JSON only):
{
  "summary": "1-2 sentence overview",
  "keyFindings": [
    "⭐ Finding with emoji",
    "📈 Another finding",
    "🕐 Time-related finding",
    "💡 Business insight"
  ],
  "comparison": "Optional comparison analysis",
  "trend": "Optional trend analysis",
  "anomaly": "⚠️ Optional anomaly detection",
  "recommendation": "💡 Optional actionable recommendation"
}

Guidelines:
- Use Korean language naturally
- Include emojis for visual appeal (⭐, 📈, 🕐, 💡, ⚠️, 📊, 🔥)
- Focus on actionable insights, not just data description
- Detect patterns, trends, and anomalies
- Provide business recommendations when possible`;

  const user = `User Query: "${userQuery}"

SQL: ${sqlQuery}

Results (${queryResults.length} rows):
${JSON.stringify(queryResults.slice(0, 10), null, 2)}

Generate insights in JSON format.`;

  return { system, user };
}
```

**3. 시각화 선택 프롬프트**
```typescript
// src/prompts/visualization-selection.prompt.ts
export function buildVisualizationSelectionPrompt(
  userQuery: string,
  sqlQuery: string,
  queryResults: unknown[]
): { system: string; user: string } {
  const system = `You are a data visualization specialist.

Your task:
- Analyze query results structure
- Recommend optimal visualization type
- Choose between: chart (with chartType), table, or both

Response format (JSON only):
{
  "type": "chart|table|both",
  "chartType": "bar|line|pie (if type is chart or both)",
  "reason": "Explanation in Korean"
}

Decision criteria:
- Time-series data → line chart
- Category comparison → bar chart
- Few items with percentages → pie chart
- Complex multi-dimensional → table
- Visual + detail needed → both

Guidelines:
- Prefer visual representation when possible
- Use "both" for important data that benefits from both views
- Consider data size (too many rows → table only)
- Use Korean for reason`;

  const user = `User Query: "${userQuery}"

SQL: ${sqlQuery}

Results structure:
Columns: ${queryResults.length > 0 ? Object.keys(queryResults[0] as object).join(', ') : 'N/A'}
Row count: ${queryResults.length}
Sample data: ${JSON.stringify(queryResults.slice(0, 3), null, 2)}

Recommend visualization in JSON format.`;

  return { system, user };
}
```

**Acceptance Criteria**:
- [x] query-analysis.prompt.ts 작성 완료
- [x] insight-generation.prompt.ts 작성 완료
- [x] visualization-selection.prompt.ts 작성 완료
- [x] 프롬프트가 구조화된 JSON 응답 생성하도록 설계
- [x] 한국어 자연어 출력 지원

---

### Task 7.3: BedrockService 새로운 메서드 추가

**목표**: BedrockService에 3개의 새로운 AI 메서드 추가

**구현 단계**:

**1. analyzeQuery 메서드**
```typescript
// src/common/bedrock.service.ts (추가)
async analyzeQuery(userQuery: string): Promise<{
  needsClarification: boolean;
  reason?: string;
  questions?: Array<{
    type: 'period' | 'limit' | 'filter' | 'grouping';
    question: string;
    options: string[];
    default: string;
  }>;
}> {
  const { system, user } = buildQueryAnalysisPrompt(userQuery);

  const response = await this.invokeModel(
    [{ role: 'user', content: user }],
    {
      system,
      max_tokens: 1024,
      temperature: 0.3,
    }
  );

  const result = JSON.parse(response.content[0].text);
  return result;
}
```

**2. generateInsights 메서드**
```typescript
async generateInsights(
  userQuery: string,
  sqlQuery: string,
  queryResults: unknown[]
): Promise<{
  summary: string;
  keyFindings: string[];
  comparison?: string;
  trend?: string;
  anomaly?: string;
  recommendation?: string;
}> {
  const { system, user } = buildInsightGenerationPrompt(
    userQuery,
    sqlQuery,
    queryResults
  );

  const response = await this.invokeModel(
    [{ role: 'user', content: user }],
    {
      system,
      max_tokens: 2048,
      temperature: 0.7,
    }
  );

  const insights = JSON.parse(response.content[0].text);
  return insights;
}
```

**3. selectVisualization 메서드**
```typescript
async selectVisualization(
  userQuery: string,
  sqlQuery: string,
  queryResults: unknown[]
): Promise<{
  type: 'chart' | 'table' | 'both';
  chartType?: 'bar' | 'line' | 'pie';
  reason: string;
}> {
  const { system, user } = buildVisualizationSelectionPrompt(
    userQuery,
    sqlQuery,
    queryResults
  );

  const response = await this.invokeModel(
    [{ role: 'user', content: user }],
    {
      system,
      max_tokens: 512,
      temperature: 0.3,
    }
  );

  const visualization = JSON.parse(response.content[0].text);
  return visualization;
}
```

**Acceptance Criteria**:
- [x] analyzeQuery 메서드 구현 완료
- [x] generateInsights 메서드 구현 완료
- [x] selectVisualization 메서드 구현 완료
- [x] JSON 파싱 에러 처리 추가
- [x] Temperature 파라미터 최적화

---

### Task 7.4: QueryService 고도화

**목표**: QueryService의 파이프라인 재구성 (질의 분석 단계 추가)

**구현 단계**:

**1. 새로운 파이프라인 구조**
```typescript
// src/modules/query/query.service.ts (수정)
async queryFromNaturalLanguage(userQuery: string): Promise<EnhancedQueryResult> {
  this.logger.log(`=== Phase 7 Enhanced Query Pipeline Start ===`);
  this.logger.log(`User Query: ${userQuery}`);

  // Step 1: 질의 분석 (추가 질문 필요 여부 판단)
  const clarificationResult = await this.analyzeQuery(userQuery);

  // 추가 질문이 필요한 경우 여기서 반환
  if (clarificationResult && clarificationResult.needsClarification) {
    this.logger.log('Returning clarifying questions to user');
    return {
      query: userQuery,
      sql: '',
      results: [],
      executionTime: 0,
      insights: {
        summary: '질문을 더 구체화해주시면 정확한 답변을 드릴 수 있습니다.',
        keyFindings: [],
      },
      visualization: {
        type: 'table',
        reason: '추가 정보가 필요합니다.',
      },
      clarifyingQuestions: {
        reason: clarificationResult.reason!,
        questions: clarificationResult.questions!,
      },
    };
  }

  // Step 2-4: SQL 생성 및 실행
  const sql = await this.generateSQL(userQuery);
  const { data, executionTime } = await this.executeSQL(sql);

  // 결과가 없는 경우
  if (data.length === 0) {
    return {
      query: userQuery,
      sql,
      results: [],
      executionTime,
      insights: {
        summary: '조회 결과가 없습니다.',
        keyFindings: ['📊 해당 조건에 맞는 데이터가 없습니다'],
      },
      visualization: {
        type: 'table',
        reason: '결과가 없어 테이블로 표시합니다.',
      },
    };
  }

  // Step 5: 인사이트 생성 및 시각화 선택 (병렬 처리)
  const [insights, visualization] = await Promise.all([
    this.bedrockService.generateInsights(userQuery, sql, data),
    this.bedrockService.selectVisualization(userQuery, sql, data),
  ]);

  this.logger.log(`=== Phase 7 Enhanced Query Pipeline Complete ===`);

  return {
    query: userQuery,
    sql,
    results: data,
    executionTime,
    insights,
    visualization,
  };
}
```

**2. analyzeQuery 헬퍼 메서드**
```typescript
async analyzeQuery(userQuery: string): Promise<{
  needsClarification: boolean;
  reason?: string;
  questions?: Array<{...}>;
} | null> {
  this.logger.log('Step 1: Analyzing user query');

  try {
    const analysis = await this.bedrockService.analyzeQuery(userQuery);

    if (analysis.needsClarification) {
      this.logger.log('Query needs clarification');
      return analysis;
    }

    this.logger.log('Query is sufficient, proceeding to SQL generation');
    return null;
  } catch (error) {
    this.logger.error('Query analysis failed, proceeding without clarification', error);
    return null;
  }
}
```

**Acceptance Criteria**:
- [x] 5단계 파이프라인 구현 완료
- [x] 질의 분석 단계 추가
- [x] 병렬 처리 최적화 (insights + visualization)
- [x] 에러 핸들링 강화
- [x] 로깅 개선

---

### Task 7.5: QueryMapper 수정

**목표**: 새로운 DTO 필드 매핑 로직 추가

**구현 단계**:

```typescript
// src/modules/query/query.mapper.ts (수정)
@Injectable()
export class QueryMapper {
  toDto(result: EnhancedQueryResult): QueryResponseDto {
    const dto = new QueryResponseDto({
      query: result.query,
      sql: result.sql,
      results: result.results,
      executionTime: result.executionTime,
      rowCount: result.results.length,
      timestamp: new Date().toISOString(),
      visualization: this.mapVisualization(result.visualization),
      insights: this.mapInsights(result.insights),
    });

    // 추가 질문이 있는 경우에만 포함
    if (result.clarifyingQuestions) {
      dto.clarifyingQuestions = this.mapClarifyingQuestions(result.clarifyingQuestions);
    }

    return dto;
  }

  private mapVisualization(visualization: {...}): VisualizationDto {
    const viz = new VisualizationDto();
    viz.type = visualization.type;
    viz.chartType = visualization.chartType;
    viz.reason = visualization.reason;
    return viz;
  }

  private mapInsights(insights: {...}): InsightsDto {
    const ins = new InsightsDto();
    ins.summary = insights.summary;
    ins.keyFindings = insights.keyFindings;
    ins.comparison = insights.comparison;
    ins.trend = insights.trend;
    ins.anomaly = insights.anomaly;
    ins.recommendation = insights.recommendation;
    return ins;
  }

  private mapClarifyingQuestions(questions: {...}): ClarifyingQuestionsDto {
    const clarifying = new ClarifyingQuestionsDto();
    clarifying.reason = questions.reason;
    clarifying.questions = questions.questions.map((q) => {
      const item = new ClarifyingQuestionItemDto();
      item.type = q.type;
      item.question = q.question;
      item.options = q.options;
      item.default = q.default;
      return item;
    });
    return clarifying;
  }
}
```

**Acceptance Criteria**:
- [x] mapVisualization 메서드 추가
- [x] mapInsights 메서드 추가
- [x] mapClarifyingQuestions 메서드 추가
- [x] 선택적 필드 처리 (clarifyingQuestions)

---

### Task 7.6: 프론트엔드 UI 개선

**목표**: 추가 질문 모달 및 화려한 인사이트 표시

**구현 단계**:

**1. 추가 질문 모달**
```tsx
// frontend/src/components/pages/QueryPage.tsx (수정)
{showClarifyingModal && result?.clarifyingQuestions && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          질문을 좀 더 구체화해주세요
        </h3>
        <button
          onClick={() => setShowClarifyingModal(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <p className="text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
          {result.clarifyingQuestions.reason}
        </p>

        {result.clarifyingQuestions.questions.map((question, index) => (
          <div key={index} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {question.question}
            </label>
            <select
              value={clarifyingAnswers[index] || question.default}
              onChange={(e) =>
                setClarifyingAnswers({ ...clarifyingAnswers, [index]: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {question.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
        <button
          onClick={() => setShowClarifyingModal(false)}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          취소
        </button>
        <button
          onClick={handleClarifyingSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          다시 질의하기
        </button>
      </div>
    </div>
  </div>
)}
```

**2. 화려한 인사이트 표시**
```tsx
{result.insights && (
  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200 space-y-4">
    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
      <Sparkles className="w-6 h-6 text-purple-600" />
      AI 인사이트
    </h3>

    {/* 요약 */}
    <div className="bg-white bg-opacity-80 p-4 rounded-lg">
      <p className="text-gray-800 text-lg leading-relaxed">{result.insights.summary}</p>
    </div>

    {/* 핵심 발견사항 */}
    {result.insights.keyFindings.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
          핵심 발견사항
        </h4>
        <ul className="space-y-2">
          {result.insights.keyFindings.map((finding, idx) => (
            <li
              key={idx}
              className="bg-white bg-opacity-80 p-3 rounded-lg text-gray-800 flex items-start gap-2"
            >
              <span className="text-xl mt-0.5">{finding.split(' ')[0]}</span>
              <span>{finding.substring(finding.indexOf(' ') + 1)}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* 비교 분석 */}
    {result.insights.comparison && (
      <div className="bg-blue-50 bg-opacity-80 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
          <BarChart3 className="w-4 h-4" />
          비교 분석
        </h4>
        <p className="text-blue-900">{result.insights.comparison}</p>
      </div>
    )}

    {/* 트렌드 */}
    {result.insights.trend && (
      <div className="bg-green-50 bg-opacity-80 p-4 rounded-lg border border-green-200">
        <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          트렌드
        </h4>
        <p className="text-green-900">{result.insights.trend}</p>
      </div>
    )}

    {/* 이상치/특이사항 */}
    {result.insights.anomaly && (
      <div className="bg-yellow-50 bg-opacity-80 p-4 rounded-lg border border-yellow-300">
        <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          특이사항
        </h4>
        <p className="text-yellow-900">{result.insights.anomaly}</p>
      </div>
    )}

    {/* 추천 사항 */}
    {result.insights.recommendation && (
      <div className="bg-indigo-50 bg-opacity-80 p-4 rounded-lg border border-indigo-200">
        <h4 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-1">
          <Lightbulb className="w-4 h-4" />
          추천 사항
        </h4>
        <p className="text-indigo-900">{result.insights.recommendation}</p>
      </div>
    )}
  </div>
)}
```

**3. 자동 차트 타입 선택**
```tsx
// AI 추천 차트 타입 자동 설정
onSuccess: (data) => {
  setResult(data);

  if (data.clarifyingQuestions) {
    setShowClarifyingModal(true);
    // 기본값 설정
    const defaultAnswers: Record<number, string> = {};
    data.clarifyingQuestions.questions.forEach((q, index) => {
      defaultAnswers[index] = q.default;
    });
    setClarifyingAnswers(defaultAnswers);
  } else if (data.visualization?.chartType) {
    setChartType(data.visualization.chartType); // AI 추천 자동 적용
  }
}
```

**Acceptance Criteria**:
- [x] 추가 질문 모달 UI 구현
- [x] 화려한 인사이트 표시 (gradient, 이모지, 컬러풀)
- [x] AI 추천 차트 타입 자동 적용
- [x] 반응형 디자인
- [x] 부드러운 애니메이션

---

### Task 7.7: 통합 테스트 및 검증

**목표**: End-to-End 테스트를 통한 Phase 7 기능 검증

**테스트 시나리오**:

**Test 1: 완전한 질의**
```
Input: "최근 30일간 가장 많이 팔린 상품 Top 10은?"
Expected:
  ✅ SQL 생성 및 실행
  ✅ 6가지 인사이트 생성 (summary, keyFindings, comparison, trend, anomaly, recommendation)
  ✅ AI 자동 시각화 추천 (both: Bar Chart + Table)
  ✅ 이모지 포함 화려한 UI
```

**Test 2: 불완전한 질의 → 추가 질문**
```
Input: "가장 많이 팔린 상품은?"
Expected:
  ✅ 추가 질문 모달 표시
  ✅ 2개 질문: "어떤 기간?", "상위 몇 개?"
  ✅ 드롭다운 옵션 표시
  ✅ 사용자 선택 후 재질의
  ✅ 재질의 결과 정상 표시
```

**Test 3: 결과 없음**
```
Input: "2050년 데이터를 보여줘"
Expected:
  ✅ "조회 결과가 없습니다" 메시지
  ✅ 기본 인사이트 표시
```

**실행 방법**:
```bash
# Backend 실행
yarn run start:dev

# Frontend 실행
cd frontend && yarn dev

# Playwright 테스트 (선택)
playwright test e2e/phase7.spec.ts
```

**Acceptance Criteria**:
- [x] Test 1: 완전한 질의 성공
- [x] Test 2: 불완전한 질의 → 추가 질문 → 재질의 성공
- [x] Test 3: 결과 없음 처리 성공
- [x] 모든 이모지 정상 표시
- [x] 차트 자동 선택 동작 확인

---

### Task 7.8: README 업데이트

**목표**: Phase 7 기능 및 사용법 문서화

**문서 내용**:
- Phase 7 체크리스트
- 주요 기능 4가지 설명
- 인사이트 6가지 유형 예시
- 테스트 결과 요약
- 기술 스택 업데이트

**Acceptance Criteria**:
- [x] README.md에 Phase 7 섹션 추가
- [x] 코드 예시 포함
- [x] 스크린샷 추가 (선택)

---

## Phase 7 완료 조건

- [x] 구조화된 DTO 설계 완료
- [x] 프롬프트 템플릿 3개 작성 완료
- [x] BedrockService 3개 메서드 추가
- [x] QueryService 파이프라인 고도화
- [x] QueryMapper 업데이트
- [x] 프론트엔드 UI 개선 (모달 + 인사이트)
- [x] 통합 테스트 성공 (3가지 시나리오)
- [x] README 문서화 완료

---

## 프롬프트 엔지니어링 베스트 프랙티스

### 1. 구조화된 출력
```typescript
// ✅ Good: JSON Schema 명시
const system = `Response format (JSON only):
{
  "field1": "type",
  "field2": ["array"],
  ...
}`;

// ❌ Bad: 자유 형식 응답
const system = `Please analyze and respond.`;
```

### 2. Few-Shot Examples
```typescript
// ✅ Good: 예시 제공
const system = `Examples:
User: "가장 많이 팔린 상품은?"
→ needsClarification: true

User: "최근 30일간 Top 10"
→ needsClarification: false`;
```

### 3. Temperature 조정
```typescript
// 분석/분류 작업: 낮은 temperature
temperature: 0.3

// 창의적 인사이트: 중간 temperature
temperature: 0.7
```

### 4. Token 최적화
```typescript
// 큰 데이터는 샘플만 전달
const sampleData = queryResults.slice(0, 10);
```

---

## 성능 최적화

### 1. 병렬 처리
```typescript
// ✅ Good: Insights + Visualization 병렬 생성
const [insights, visualization] = await Promise.all([
  this.bedrockService.generateInsights(...),
  this.bedrockService.selectVisualization(...),
]);

// ❌ Bad: 순차 처리
const insights = await this.bedrockService.generateInsights(...);
const visualization = await this.bedrockService.selectVisualization(...);
```

### 2. 조건부 LLM 호출
```typescript
// 질의 분석 실패 시 바로 SQL 생성으로 진행
try {
  const analysis = await this.analyzeQuery(userQuery);
} catch (error) {
  // Fallback: 질의 분석 없이 진행
  return null;
}
```

### 3. Frontend 캐싱
```typescript
// TanStack Query로 결과 캐싱
const { data } = useQuery({
  queryKey: ['query', query],
  queryFn: () => api.queryAgent(query),
  staleTime: 5 * 60 * 1000, // 5분간 fresh
});
```

---

## 보안 고려사항

### 1. JSON Parsing 에러 처리
```typescript
try {
  const result = JSON.parse(response.content[0].text);
  return result;
} catch (error) {
  this.logger.error('Failed to parse LLM response', error);
  // Fallback 응답 반환
  return defaultResponse;
}
```

### 2. Prompt Injection 방어
```typescript
// 사용자 입력을 직접 프롬프트에 넣지 않고 구조화된 형식 사용
const user = `Analyze this query: "${userQuery}"`;
// ✅ 따옴표로 감싸서 명확한 경계 설정
```

### 3. 민감 정보 필터링
```typescript
// 쿼리 결과에서 민감 정보 제거 후 LLM 전달
const sanitizedResults = queryResults.map(row => ({
  ...row,
  password: undefined,
  email: maskEmail(row.email),
}));
```

---

## 향후 개선 방향

### Phase 8 (Optional)
- **스트리밍 응답**: Server-Sent Events로 인사이트 실시간 생성
- **음성 질의**: Web Speech API 연동
- **질의 추천**: 과거 질의 패턴 기반 자동 추천
- **대시보드 자동 생성**: 질의 결과 기반 대시보드 위젯 자동 생성
- **다국어 지원**: 영어/일본어/중국어 인사이트 생성

---

## 참고 자료

- [AWS Bedrock Claude 3.5 Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [LangChain Prompt Templates](https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/)
- [Recharts Documentation](https://recharts.org/)
- [TanStack Query](https://tanstack.com/query/latest)
