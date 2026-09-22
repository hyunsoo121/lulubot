import express from 'express';
import path from 'path';
import riotTxtRouter from './routes/riotTxt';
import pagesRouter from './routes/pages';

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use('/screenshots', express.static(path.join(__dirname, '../../public/screenshots')));
  app.use(riotTxtRouter);
  app.use(pagesRouter);

  return app;
}
