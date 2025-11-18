import { RunnableConfig } from '@langchain/core/runnables';

import { SearchService } from '@/modules/search/search.service';

import { AgentStateType } from '../state';

/**
 * Semantic Search Node
 * 자연어 질의를 벡터 검색으로 변환하여 유사한 상품을 찾습니다.
 */
export async function semanticSearchNode(
  state: AgentStateType,
  config?: RunnableConfig,
): Promise<Partial<AgentStateType>> {
  const { input } = state;

  // SearchService를 config에서 가져옴
  const searchService = config?.configurable?.searchService as SearchService;

  if (!searchService) {
    return {
      error: 'SearchService not configured',
    };
  }

  try {
    // 의미 기반 검색 실행
    const results = await searchService.semanticSearch(input, 10);

    // 결과를 JSON 형식으로 변환
    const semanticResults = results.map((r) => ({
      product_id: r.productId,
      product_name: r.name,
      description: r.description,
      category: r.category,
      market_name: r.marketName,
      similarity_score: r.score,
    }));

    return {
      semanticResults,
      metadata: {
        ...state.metadata,
        resultCount: results.length,
        searchMethod: 'semantic',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      error: `Failed to execute semantic search: ${errorMessage}`,
    };
  }
}
