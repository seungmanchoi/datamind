import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 숫자를 천단위 콤마와 '원' 단위로 포맷팅
 * @param value - 숫자 값
 * @returns 포맷된 문자열 (예: "1,234,567원")
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0원';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0원';
  }

  return `${num.toLocaleString('ko-KR')}원`;
}

/**
 * 숫자를 천단위 콤마로 포맷팅 (단위 없음)
 * @param value - 숫자 값
 * @returns 포맷된 문자열 (예: "1,234,567")
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  return num.toLocaleString('ko-KR');
}
