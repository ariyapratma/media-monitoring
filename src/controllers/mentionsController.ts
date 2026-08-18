import { Request, Response, NextFunction } from 'express';
import { asyncHandler, sendSuccess, sendError } from './baseController';
import { searchMentions } from '../services/searchService';

export const searchMentionsController = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const source = req.query.source as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));

  const result = await searchMentions({ q, source, from, to, page, limit });
  return sendSuccess(res, {
    data: result.data,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: result.totalPages,
    },
  }, 200);
});
