import type { Request, Response } from 'express';
import { ok } from '../../shared/utils/http';
import { listTags } from './tags.service';

export async function getTagsController(req: Request, res: Response): Promise<void> {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const tags = await listTags(search);
  res.json(ok(tags));
}
