import { Request, Response, NextFunction } from 'express';

export function asyncHandler(fn: (_req: Request, _res: Response, _next: NextFunction) => Promise<Response | void>) {
  return (_req: Request, _res: Response, _next: NextFunction) => {
    Promise.resolve(fn(_req, _res, _next)).catch(_next);
  };
}

export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json(data);
}

export function sendError(res: Response, status: number, message: string): Response {
  return res.status(status).json({ error: message });
}
