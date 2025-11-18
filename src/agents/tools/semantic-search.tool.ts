import { Tool } from '@langchain/core/tools';

import { SearchService } from '@/modules/search/search.service';

/**
 * Semantic Search Tool
 * 자연어 질의를 벡터 검색으로 변환하여 유사한 상품을 찾습니다.
 */
export class SemanticSearchTool extends Tool {
  name = 'semantic_search';

  description = `Search for products using natural language semantic search.
    Use this when the user asks about product features, descriptions, or attributes
    that are not easily queryable with SQL.
    Input should be a natural language query string.
    Examples: "여름용 시원한 소재", "남성 캐주얼 셔츠", "가성비 좋은 제품"`;

  constructor(private searchService: SearchService) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      // Input can be either a plain query string or JSON object
      let query: string;
      let topK = 10;

      try {
        const parsed = JSON.parse(input);
        query = parsed.query || input;
        topK = parsed.topK || 10;
      } catch {
        // If parsing fails, treat input as plain query string
        query = input;
      }

      const results = await this.searchService.semanticSearch(query, topK);

      return JSON.stringify({
        success: true,
        count: results.length,
        results: results.map((r) => ({
          id: r.productId,
          name: r.name,
          description: r.description,
          category: r.category,
          market: r.marketName,
          score: r.score,
        })),
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
