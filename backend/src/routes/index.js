import express from 'express'
import authRouter from './auth.js'
import itemsRouter from './items.js'
import ebayRouter from './ebay.js'

const router = express.Router();
router.use('/auth', authRouter);
router.use('/items', itemsRouter);
router.use('/ebay', ebayRouter);

export default router;