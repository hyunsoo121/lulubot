import { Router, Request, Response } from 'express';
import { landingHtml } from '../views/landing';
import { privacyHtml } from '../views/privacy';
import { termsHtml } from '../views/terms';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.type('text/html').send(landingHtml);
});

router.get('/privacy', (_req: Request, res: Response) => {
  res.type('text/html').send(privacyHtml);
});

router.get('/terms', (_req: Request, res: Response) => {
  res.type('text/html').send(termsHtml);
});

export default router;
