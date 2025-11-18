import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class QueryRepository {
  private readonly logger = new Logger(QueryRepository.name);
  private schemaCache: string | null = null;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 데이터베이스 스키마 정보 조회 및 캐싱
   * @returns 스키마 정보 (테이블명, 컬럼명, 타입 등)
   */
  async getSchema(): Promise<string> {
    if (this.schemaCache) {
      this.logger.debug('Using cached schema');
      return this.schemaCache;
    }

    this.logger.log('Fetching database schema...');

    try {
      // MySQL의 INFORMATION_SCHEMA를 사용하여 스키마 정보 조회
      const tables = await this.dataSource.query(`
        SELECT
          TABLE_NAME,
          TABLE_COMMENT
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME
      `);

      const schemaInfo: string[] = [];

      for (const table of tables) {
        const columns = await this.dataSource.query(
          `
          SELECT
            COLUMN_NAME,
            COLUMN_TYPE,
            IS_NULLABLE,
            COLUMN_KEY,
            COLUMN_COMMENT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
          [table.TABLE_NAME],
        );

        const columnInfo = columns
          .map(
            (col: {
              COLUMN_NAME: string;
              COLUMN_TYPE: string;
              IS_NULLABLE: string;
              COLUMN_KEY: string;
              COLUMN_COMMENT: string;
            }) =>
              `  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE})${
                col.COLUMN_KEY === 'PRI' ? ' [PRIMARY KEY]' : ''
              }${col.COLUMN_KEY === 'MUL' ? ' [INDEXED]' : ''}${
                col.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''
              }${col.COLUMN_COMMENT ? ` // ${col.COLUMN_COMMENT}` : ''}`,
          )
          .join('\n');

        schemaInfo.push(`
Table: ${table.TABLE_NAME}${table.TABLE_COMMENT ? ` // ${table.TABLE_COMMENT}` : ''}
${columnInfo}
`);
      }

      this.schemaCache = schemaInfo.join('\n');
      this.logger.log('Schema fetched and cached successfully');

      return this.schemaCache;
    } catch (error) {
      this.logger.error('Failed to fetch schema', error);
      throw error;
    }
  }

  /**
   * SQL 쿼리 실행
   * @param sql SQL 쿼리
   * @returns 쿼리 결과 데이터
   */
  async execute(sql: string): Promise<unknown[]> {
    this.logger.log(`Executing SQL: ${sql}`);

    try {
      const data = await this.dataSource.query(sql);
      this.logger.log(`Query executed successfully, returned ${data.length} rows`);
      return data;
    } catch (error) {
      this.logger.error('Failed to execute SQL', error);
      throw error;
    }
  }

  /**
   * 스키마 캐시 초기화
   */
  clearSchemaCache(): void {
    this.schemaCache = null;
    this.logger.log('Schema cache cleared');
  }
}
