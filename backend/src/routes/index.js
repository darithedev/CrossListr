import express from 'express'
import authRouter from './auth.js'
import itemsRouter from './items.js'

const router = express.Router();
router.use('/auth', authRouter);
router.use('/items', itemsRouter);

export default router;