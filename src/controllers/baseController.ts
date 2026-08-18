import { Request, Response, NextFunction } from 'express';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json(data);
}

export function sendError(res: Response, status: number, message: string): Response {
  return res.status(status).json({ error: message });
}
