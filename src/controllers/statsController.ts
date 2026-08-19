import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendError } from './baseController';
import { getStats } from '../services/statsService';

export const getStatsController = asyncHandler(async (req: Request, res: Response) => {
  const groupBy = req.query.group_by as string | undefined;

  if (!groupBy || (groupBy !== 'source' && groupBy !== 'day')) {
    return sendError(res, 400, 'Invalid group_by parameter. Allowed values: source, day');
  }

  const stats = await getStats(groupBy);
  return sendSuccess(res, stats, 200);
});
