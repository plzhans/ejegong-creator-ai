import express, { Request, Response } from 'express';

const router = express.Router();
export default router;

router.get('/', (_req:Request, res:Response) => {
    res.json({
        code : 1,
        error: "Ok"
    });
});

