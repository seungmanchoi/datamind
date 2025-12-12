import type { MultiAgentResponse } from '@/lib/api';

import DataTable from '../data/DataTable';
import ExportButtons from '../data/ExportButtons';
import MultiDataTable from '../data/MultiDataTable';
import FollowUpQuestions from '../followup/FollowUpQuestions';
import InsightsList from '../insights/InsightsList';
import ChartComponent from '../visualizations/ChartComponent';
import SqlQueryHistory from '../workflow/SqlQueryHistory';
import WorkflowVisualization from '../workflow/WorkflowVisualization';
import ErrorDisplay from './ErrorDisplay';
import ResponseMeta from './ResponseMeta';

interface Props {
  response: MultiAgentResponse;
  onFollowUpClick?: (query: string) => void;
  onRetry?: () => void;
}

export default function ResponseContainer({ response, onFollowUpClick, onRetry }: Props) {
  const { meta, data, insights, visualizations, followUp, workflow, error } = response;

  // 에러 응답 처리
  if (error) {
    return (
      <div className="space-y-4">
        <ResponseMeta meta={meta} />
        <ErrorDisplay error={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 메타 정보 */}
      <ResponseMeta meta={meta} />

      {/* 워크플로우 시각화 */}
      {workflow && workflow.steps.length > 0 && (
        <WorkflowVisualization steps={workflow.steps} totalDuration={workflow.totalDuration} />
      )}

      {/* SQL 쿼리 히스토리 */}
      {workflow && workflow.queryHistory.length > 0 && <SqlQueryHistory queries={workflow.queryHistory} />}

      {/* 내보내기 버튼 (엑셀, PDF) */}
      {(data || insights) && (
        <div className="glass rounded-2xl p-4">
          <ExportButtons title={meta.query} data={data} insights={insights} />
        </div>
      )}

      {/* 인사이트 섹션 */}
      {insights && (
        <InsightsList
          summary={insights.summary}
          items={insights.items}
          overallConfidence={insights.overallConfidence}
        />
      )}

      {/* 시각화 섹션 - Primary 차트 */}
      {visualizations?.primary && (
        <ChartComponent
          config={visualizations.primary}
          reason={visualizations.reason}
        />
      )}

      {/* 시각화 섹션 - 추가 차트들 (다중 데이터셋) */}
      {visualizations?.alternatives && visualizations.alternatives.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white px-2">추가 시각화</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visualizations.alternatives.map((altChart) => (
              <ChartComponent
                key={altChart.id}
                config={altChart}
              />
            ))}
          </div>
        </div>
      )}

      {/* SQL 데이터 테이블 - 다중 쿼리 결과 */}
      {data?.multiSql && <MultiDataTable multiSql={data.multiSql} title={meta.query} />}

      {/* SQL 데이터 테이블 - 단일 쿼리 결과 (multiSql이 없을 때만) */}
      {!data?.multiSql && data?.sql && (
        <DataTable
          columns={data.sql.columns}
          rows={data.sql.rows}
          rowCount={data.sql.rowCount}
          executionTime={data.sql.executionTime}
          query={data.sql.query}
          title={meta.query}
        />
      )}

      {/* 검색 결과 */}
      {data?.search && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">검색 결과</h3>
          <p className="text-slate-400 text-sm mb-3">
            총 {data.search.totalCount}건 ({data.search.type} 검색)
          </p>
          <div className="space-y-2">
            {data.search.results.map((item) => (
              <div key={item.id} className="bg-slate-900/50 rounded-lg p-4 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{item.name}</span>
                  <span className="text-sm text-primary">유사도 {Math.round(item.score * 100)}%</span>
                </div>
                {item.description && <p className="text-sm text-slate-400 mt-1">{item.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 후속 질문 */}
      {followUp?.enabled && followUp.questions.length > 0 && (
        <FollowUpQuestions questions={followUp.questions} onQuestionClick={onFollowUpClick} />
      )}
    </div>
  );
}
