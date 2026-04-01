import { Router, Request, Response } from 'express';

const router = Router();

// Riot 토너먼트 콜백 수신
router.post('/callback', async (req: Request, res: Response) => {
  // TODO: 구현
  res.sendStatus(200);
});

export default router;
