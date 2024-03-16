import express, { Request, Response } from 'express';

const router = express.Router();
export default router;

router.get('/webhook', (_req: Request, res: Response) => {
  res.json('Item Route - GET /item');
});

router.post('/webhook', (_req: Request, res: Response) => {
  res.send('Item Route - GET /item');
});
