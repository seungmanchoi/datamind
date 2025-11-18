import { Tool } from '@langchain/core/tools';
import { DataSource } from 'typeorm';

interface TableSchema {
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    key: string;
  }>;
}

/**
 * 데이터베이스 스키마를 조회하는 LangChain Tool
 * Agent가 테이블 구조를 파악하여 올바른 SQL을 생성할 수 있도록 지원
 */
export class SchemaRetrievalTool extends Tool {
  name = 'schema_retrieval';
  description = `
    Retrieve database schema information including table names and column details.
    Input can be empty (get all tables) or a specific table name.
    Returns table schema information as JSON.
    Use this tool when you need to understand the database structure before writing queries.
  `;

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  /**
   * 스키마 정보 조회
   * @param input - 테이블 이름 (옵션, 빈 문자열이면 모든 테이블)
   * @returns 스키마 정보 (JSON 문자열)
   */
  async _call(input: string): Promise<string> {
    try {
      const tableName = input.trim();

      if (tableName) {
        // 특정 테이블의 스키마 조회
        const schema = await this.getTableSchema(tableName);
        return JSON.stringify(schema, null, 2);
      } else {
        // 모든 테이블 목록 조회
        const tables = await this.getAllTables();
        return JSON.stringify(
          {
            tables,
            message: 'Use schema_retrieval with a table name to get detailed column information',
          },
          null,
          2,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return JSON.stringify({
        error: true,
        message: `Failed to retrieve schema: ${errorMessage}`,
      });
    }
  }

  /**
   * 모든 테이블 이름 조회
   */
  private async getAllTables(): Promise<string[]> {
    const result = await this.dataSource.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    return result.map((row: { TABLE_NAME: string }) => row.TABLE_NAME);
  }

  /**
   * 특정 테이블의 스키마 조회
   */
  private async getTableSchema(tableName: string): Promise<TableSchema> {
    const columns = await this.dataSource.query(
      `
      SELECT
        COLUMN_NAME as name,
        COLUMN_TYPE as type,
        IS_NULLABLE as nullable,
        COLUMN_KEY as \`key\`
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `,
      [tableName],
    );

    return {
      tableName,
      columns: columns.map((col: { name: string; type: string; nullable: string; key: string }) => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable === 'YES',
        key: col.key,
      })),
    };
  }
}
