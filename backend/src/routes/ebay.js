import express from 'express'
import pool from '../db/pools.js'
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Routor();

export default router;