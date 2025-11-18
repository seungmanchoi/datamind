import { Tool } from '@langchain/core/tools';
import { DataSource } from 'typeorm';

/**
 * SQL 쿼리를 실행하는 LangChain Tool
 * Agent가 생성한 SQL을 실행하고 결과를 반환
 */
export class SqlExecutorTool extends Tool {
  name = 'sql_executor';
  description = `
    Execute SQL queries against the MySQL database.
    Input should be a valid SQL SELECT query.
    Returns the query results as JSON.
    Use this tool when you need to retrieve data from the database.
  `;

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  /**
   * SQL 쿼리 실행
   * @param query - 실행할 SQL 쿼리
   * @returns 쿼리 결과 (JSON 문자열)
   */
  async _call(query: string): Promise<string> {
    try {
      // SQL 쿼리 유효성 검증 (SELECT만 허용)
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        throw new Error('Only SELECT queries are allowed for security reasons');
      }

      // 쿼리 실행
      const results = await this.dataSource.query(query);

      // 결과를 JSON 문자열로 반환
      return JSON.stringify(results, null, 2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return JSON.stringify({
        error: true,
        message: `Failed to execute SQL query: ${errorMessage}`,
      });
    }
  }
}
