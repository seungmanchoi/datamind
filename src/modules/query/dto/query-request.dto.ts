import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class QueryRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, {
    message: 'Query must be at least 3 characters long',
  })
  @MaxLength(500, {
    message: 'Query must not exceed 500 characters',
  })
  query: string;
}
