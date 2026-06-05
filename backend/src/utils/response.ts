import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export function success<T>(res: Response, data: T, message?: string, statusCode = 200) {
  const response: ApiResponse<T> = { success: true, data, message };
  return res.status(statusCode).json(response);
}

export function error(res: Response, message: string, statusCode = 400, err?: any) {
  const response: ApiResponse = {
    success: false,
    error: message,
    message: err?.detail || err?.message || message,
  };
  return res.status(statusCode).json(response);
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
  return res.status(200).json(response);
}

// Error handling middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled error:', err);

  if (err.code === '23505') {
    return error(res, 'Duplicate entry — this record already exists.', 409, err);
  }
  if (err.code === '23503') {
    return error(res, 'Referenced record does not exist.', 400, err);
  }
  if (err.code === '23514') {
    return error(res, 'Constraint violation — please check your input values.', 400, err);
  }

  return error(res, 'Internal server error', 500, err);
}

// 404 handler
export function notFound(req: Request, res: Response) {
  return error(res, `Route ${req.method} ${req.path} not found`, 404);
}

// Async wrapper
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
