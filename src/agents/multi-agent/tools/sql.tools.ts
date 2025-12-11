import { tool } from '@langchain/core/tools';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { z } from 'zod';

const logger = new Logger('SqlTools');

/**
 * SQL 관련 도구 생성 팩토리
 */
export function createSqlTools(dataSource: DataSource) {
  /**
   * 데이터베이스 스키마 조회 도구
   */
  const getSchema = tool(
    async ({ tableName }) => {
      logger.log(`🔧 [get_schema] 호출됨 - tableName: ${tableName || '전체'}`);
      try {
        if (tableName) {
          // 특정 테이블의 스키마 조회
          const columns = await dataSource.query(
            `
            SELECT
              COLUMN_NAME as name,
              COLUMN_TYPE as type,
              IS_NULLABLE as nullable,
              COLUMN_KEY as \`key\`,
              COLUMN_COMMENT as comment
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
          `,
            [tableName],
          );

          return JSON.stringify(
            {
              tableName,
              columns: columns.map(
                (col: { name: string; type: string; nullable: string; key: string; comment: string }) => ({
                  name: col.name,
                  type: col.type,
                  nullable: col.nullable === 'YES',
                  key: col.key,
                  comment: col.comment,
                }),
              ),
            },
            null,
            2,
          );
        } else {
          // 모든 테이블 목록 조회
          const tables = await dataSource.query(`
            SELECT TABLE_NAME, TABLE_COMMENT
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
          `);

          return JSON.stringify(
            {
              tables: tables.map((t: { TABLE_NAME: string; TABLE_COMMENT: string }) => ({
                name: t.TABLE_NAME,
                comment: t.TABLE_COMMENT,
              })),
              hint: '특정 테이블의 상세 스키마를 보려면 tableName 파라미터를 지정하세요.',
            },
            null,
            2,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({ error: true, message: `스키마 조회 실패: ${errorMessage}` });
      }
    },
    {
      name: 'get_schema',
      description:
        '데이터베이스 스키마 정보를 조회합니다. tableName이 없으면 전체 테이블 목록을, 있으면 해당 테이블의 컬럼 정보를 반환합니다.',
      schema: z.object({
        tableName: z.string().optional().describe('조회할 테이블 이름 (선택)'),
      }),
    },
  );

  /**
   * SQL 쿼리 실행 도구
   */
  const executeSQL = tool(
    async ({ query }) => {
      logger.log(`🔧 [execute_sql] 호출됨`);
      logger.log(`   쿼리 미리보기: ${query.substring(0, 100)}...`);
      try {
        // SELECT 또는 WITH...SELECT 쿼리만 허용
        const trimmedQuery = query.trim().toLowerCase();
        const isSelectQuery = trimmedQuery.startsWith('select');
        const isWithSelectQuery = trimmedQuery.startsWith('with') && trimmedQuery.includes('select');

        if (!isSelectQuery && !isWithSelectQuery) {
          logger.warn(`   ❌ SELECT 외 쿼리 거부됨`);
          return JSON.stringify({
            error: true,
            message: '보안상 SELECT 쿼리만 허용됩니다. (WITH...SELECT CTE도 허용)',
          });
        }

        const startTime = Date.now();
        const results = await dataSource.query(query);
        const executionTime = Date.now() - startTime;

        logger.log(`   ✅ 실행 완료 - ${results.length}개 행, ${executionTime}ms`);
        return JSON.stringify({
          success: true,
          data: results,
          rowCount: results.length,
          executionTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // SQL 실패 시 전체 쿼리 로깅
        logger.error(`   ❌ SQL 실행 실패: ${errorMessage}`);
        logger.error(`   📝 실패한 전체 쿼리:\n${query}`);
        return JSON.stringify({
          error: true,
          message: `SQL 실행 실패: ${errorMessage}`,
        });
      }
    },
    {
      name: 'execute_sql',
      description: 'MySQL 데이터베이스에 SELECT 쿼리를 실행하고 결과를 반환합니다.',
      schema: z.object({
        query: z.string().describe('실행할 SQL SELECT 쿼리'),
      }),
    },
  );

  /**
   * SQL 쿼리 검증 도구
   */
  const validateSQL = tool(
    async ({ query }) => {
      logger.log(`🔧 [validate_sql] 호출됨`);
      const issues: string[] = [];
      const suggestions: string[] = [];

      const lowerQuery = query.trim().toLowerCase();

      // 기본 검증 - SELECT 또는 WITH...SELECT 허용
      const isSelectQuery = lowerQuery.startsWith('select');
      const isWithSelectQuery = lowerQuery.startsWith('with') && lowerQuery.includes('select');

      if (!isSelectQuery && !isWithSelectQuery) {
        issues.push('SELECT 쿼리만 허용됩니다. (WITH...SELECT CTE도 허용)');
      }

      // 위험한 패턴 검사
      const dangerousPatterns = ['drop', 'delete', 'truncate', 'insert', 'update', 'alter', 'create'];
      for (const pattern of dangerousPatterns) {
        if (lowerQuery.includes(pattern)) {
          issues.push(`위험한 키워드 감지: ${pattern.toUpperCase()}`);
        }
      }

      // LIMIT 검사
      if (!lowerQuery.includes('limit')) {
        suggestions.push('LIMIT 절을 추가하여 결과 수를 제한하세요.');
      }

      // 인젝션 패턴 검사
      if (lowerQuery.includes('--') || lowerQuery.includes(';')) {
        issues.push('잠재적 SQL 인젝션 패턴이 감지되었습니다.');
      }

      logger.log(`   ✅ 검증 완료 - valid: ${issues.length === 0}, issues: ${issues.length}`);
      return JSON.stringify({
        valid: issues.length === 0,
        issues,
        suggestions,
      });
    },
    {
      name: 'validate_sql',
      description: 'SQL 쿼리의 유효성과 보안을 검증합니다.',
      schema: z.object({
        query: z.string().describe('검증할 SQL 쿼리'),
      }),
    },
  );

  return { getSchema, executeSQL, validateSQL };
}

export type SqlTools = ReturnType<typeof createSqlTools>;
