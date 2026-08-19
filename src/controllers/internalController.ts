import { Request, Response } from 'express';
import { asyncHandler, sendSuccess, sendError } from './baseController';
import { bulkIngest } from '../services/ingestionService';

export const bulkIngestController = asyncHandler(async (req: Request, res: Response) => {
  const records = req.body;

  if (!Array.isArray(records)) {
    return sendError(res, 400, 'Request body must be an array of mentions');
  }

  const result = await bulkIngest(records);
  return sendSuccess(res, result, 200);
});
