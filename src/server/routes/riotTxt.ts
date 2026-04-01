import { Router, Request, Response } from 'express';

const router = Router();

// Riot 도메인 인증용 riot.txt 호스팅
router.get('/riot.txt', (_req: Request, res: Response) => {
  const content = process.env.RIOT_TXT_CONTENT ?? '';
  res.type('text/plain').send(content);
});

export default router;
