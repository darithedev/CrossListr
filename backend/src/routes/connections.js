import express from 'express'
import pool from '../db/pools.js'
import jwt from 'jsonwebtoken'
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

export default router;