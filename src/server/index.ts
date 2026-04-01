import express from 'express';
import callbackRouter from './routes/callback';
import riotTxtRouter from './routes/riotTxt';

export function createServer() {
  const app = express();

  app.use(express.json());
  app.use(riotTxtRouter);
  app.use('/riot', callbackRouter);

  return app;
}
