import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Few-shot 예제 임베딩 요청 DTO
 */
export class EmbedExampleRequestDto {
  @ApiProperty({
    description: '예제 설명 (유사 질의 검색에 사용됨)',
    example: '최근 30일간 판매량 기준 상위 10개 상품을 조회하는 쿼리입니다.',
  })
  @IsString()
  @IsNotEmpty({ message: '설명을 입력해주세요.' })
  description: string;

  @ApiProperty({
    description: '실제 작동하는 SQL 쿼리',
    example:
      'SELECT p.product_name, SUM(oi.quantity) as total_sold FROM order_item oi JOIN product p ON oi.product_id = p.id WHERE oi.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY p.id ORDER BY total_sold DESC LIMIT 10',
  })
  @IsString()
  @IsNotEmpty({ message: 'SQL 쿼리를 입력해주세요.' })
  sql: string;
}

/**
 * Few-shot 예제 임베딩 응답 DTO
 */
export class EmbedExampleResponseDto {
  @ApiProperty({ description: '생성된 예제 ID', example: 'example_1234567890' })
  id: string;

  @ApiProperty({ description: '예제 설명' })
  description: string;

  @ApiProperty({ description: 'SQL 쿼리' })
  sql: string;

  @ApiProperty({ description: '처리 시간 (ms)', example: 250 })
  processingTime: number;
}

/**
 * 예제 아이템 DTO
 */
export class ExampleItemDto {
  @ApiProperty({ description: '예제 ID', example: 'example_1234567890' })
  id: string;

  @ApiProperty({ description: '예제 설명' })
  description: string;

  @ApiProperty({ description: 'SQL 쿼리' })
  sql: string;

  @ApiProperty({ description: '생성 일시' })
  createdAt: string;

  @ApiProperty({ description: '수정 일시', required: false })
  updatedAt?: string;
}

/**
 * 예제 수정 요청 DTO
 */
export class UpdateExampleRequestDto {
  @ApiProperty({
    description: '예제 설명 (유사 질의 검색에 사용됨)',
    example: '수정된 설명입니다.',
  })
  @IsString()
  @IsNotEmpty({ message: '설명을 입력해주세요.' })
  description: string;

  @ApiProperty({
    description: '실제 작동하는 SQL 쿼리',
    example: 'SELECT * FROM product WHERE id = 1',
  })
  @IsString()
  @IsNotEmpty({ message: 'SQL 쿼리를 입력해주세요.' })
  sql: string;
}

/**
 * 예제 수정 응답 DTO
 */
export class UpdateExampleResponseDto {
  @ApiProperty({ description: '예제 ID', example: 'example_1234567890' })
  id: string;

  @ApiProperty({ description: '예제 설명' })
  description: string;

  @ApiProperty({ description: 'SQL 쿼리' })
  sql: string;

  @ApiProperty({ description: '재임베딩 여부', example: true })
  reembedded: boolean;

  @ApiProperty({ description: '처리 시간 (ms)', example: 250 })
  processingTime: number;
}

/**
 * 예제 목록 응답 DTO
 */
export class ExampleListResponseDto {
  @ApiProperty({ description: '예제 목록', type: [ExampleItemDto] })
  examples: ExampleItemDto[];

  @ApiProperty({ description: '총 예제 수', example: 100 })
  total: number;

  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 10 })
  limit: number;

  @ApiProperty({ description: '총 페이지 수', example: 10 })
  totalPages: number;
}

/**
 * 임베딩 삭제 응답 DTO
 */
export class DeleteEmbeddingsResponseDto {
  @ApiProperty({ description: '삭제 성공 여부', example: true })
  success: boolean;

  @ApiProperty({ description: '결과 메시지', example: '모든 임베딩이 삭제되었습니다.' })
  message: string;

  @ApiProperty({ description: '처리 시각' })
  timestamp: string;
}
