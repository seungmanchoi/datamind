import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { SearchService } from '@/modules/search/search.service';

/**
 * 검색 도구 생성 팩토리
 */
export function createSearchTools(searchService: SearchService) {
  /**
   * 시맨틱 검색 도구
   */
  const semanticSearch = tool(
    async ({ query, limit }) => {
      try {
        const results = await searchService.semanticSearch(query, limit || 10);

        return JSON.stringify({
          type: 'semantic',
          query,
          results: results.map((r) => ({
            id: String(r.productId),
            name: r.name,
            score: r.score,
            description: r.description || '',
            category: r.category,
            marketName: r.marketName,
          })),
          totalCount: results.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `시맨틱 검색 실패: ${errorMessage}` });
      }
    },
    {
      name: 'semantic_search',
      description: '자연어로 상품을 검색합니다. 의미 기반 검색으로 유사한 상품을 찾습니다.',
      schema: z.object({
        query: z.string().describe('검색 쿼리'),
        limit: z.number().optional().describe('결과 개수 (기본값: 10)'),
      }),
    },
  );

  /**
   * 하이브리드 검색 도구
   */
  const hybridSearch = tool(
    async ({ query, limit }) => {
      try {
        const results = await searchService.hybridSearch(query, limit || 10);

        return JSON.stringify({
          type: 'hybrid',
          query,
          results: results.map((r) => ({
            id: String(r.productId),
            name: r.name,
            score: r.score,
            description: r.description || '',
            category: r.category,
            marketName: r.marketName,
          })),
          totalCount: results.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `하이브리드 검색 실패: ${errorMessage}` });
      }
    },
    {
      name: 'hybrid_search',
      description: '키워드와 의미를 결합한 하이브리드 검색을 수행합니다.',
      schema: z.object({
        query: z.string().describe('검색 쿼리'),
        limit: z.number().optional().describe('결과 개수 (기본값: 10)'),
      }),
    },
  );

  /**
   * 유사 상품 검색 도구
   */
  const similarProducts = tool(
    async ({ productId, limit }) => {
      try {
        const numericProductId = parseInt(productId, 10);
        const results = await searchService.findSimilarProducts(numericProductId, limit || 5);

        return JSON.stringify({
          type: 'similar',
          sourceProductId: productId,
          results: results.map((r) => ({
            id: String(r.productId),
            name: r.name,
            score: r.score,
            description: r.description || '',
            category: r.category,
            marketName: r.marketName,
          })),
          totalCount: results.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `유사 상품 검색 실패: ${errorMessage}` });
      }
    },
    {
      name: 'similar_products',
      description: '특정 상품과 유사한 상품을 찾습니다.',
      schema: z.object({
        productId: z.string().describe('기준 상품 ID'),
        limit: z.number().optional().describe('결과 개수 (기본값: 5)'),
      }),
    },
  );

  return { semanticSearch, hybridSearch, similarProducts };
}

/**
 * Mock 검색 도구 (SearchService 없이 테스트용)
 */
export function createMockSearchTools() {
  const semanticSearch = tool(
    async ({ query, limit }) => {
      return JSON.stringify({
        type: 'semantic',
        query,
        results: [],
        totalCount: 0,
        message: 'SearchService가 연결되지 않았습니다.',
      });
    },
    {
      name: 'semantic_search',
      description: '자연어로 상품을 검색합니다.',
      schema: z.object({
        query: z.string().describe('검색 쿼리'),
        limit: z.number().optional().describe('결과 개수'),
      }),
    },
  );

  const hybridSearch = tool(
    async ({ query, limit }) => {
      return JSON.stringify({
        type: 'hybrid',
        query,
        results: [],
        totalCount: 0,
        message: 'SearchService가 연결되지 않았습니다.',
      });
    },
    {
      name: 'hybrid_search',
      description: '하이브리드 검색을 수행합니다.',
      schema: z.object({
        query: z.string().describe('검색 쿼리'),
        limit: z.number().optional().describe('결과 개수'),
      }),
    },
  );

  const similarProducts = tool(
    async ({ productId, limit }) => {
      return JSON.stringify({
        type: 'similar',
        sourceProductId: productId,
        results: [],
        totalCount: 0,
        message: 'SearchService가 연결되지 않았습니다.',
      });
    },
    {
      name: 'similar_products',
      description: '유사 상품을 찾습니다.',
      schema: z.object({
        productId: z.string().describe('기준 상품 ID'),
        limit: z.number().optional().describe('결과 개수'),
      }),
    },
  );

  return { semanticSearch, hybridSearch, similarProducts };
}

export type SearchTools = ReturnType<typeof createSearchTools>;
