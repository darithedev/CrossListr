import express from 'express'
import authRouter from './auth.js'
import itemsRouter from './items.js'
import connectionsRouter from './connections.js'

const router = express.Router();
router.use('/auth', authRouter);
router.use('/items', itemsRouter);
router.use('/connections', connectionsRouter);

export default router;