/**
 * Centralized error handling for consistent error management
 */

import { isError } from '@/shared/type-guards';

/**
 * Extract a user-friendly error message from an unknown error
 */
export function extractErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

/**
 * Log error with context
 */
export function logError(context: string, error: unknown, ...additionalInfo: any[]): void {
  console.error(`[${context}]`, error, ...additionalInfo);
}

/**
 * Handle error with consistent logging and message extraction
 */
export function handleError(context: string, error: unknown): string {
  logError(context, error);
  return extractErrorMessage(error);
}
