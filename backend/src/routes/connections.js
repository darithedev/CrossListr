import express from 'express'
import pool from '../db/pools.js'
import jwt from 'jsonwebtoken'
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const FAKEBAY_API_URL = process.env.FAKEBAY_API_URL;
const FAKEBAY_CLIENT_ID = process.env.FAKEBAY_CLIENT_ID;
const FAKEBAY_CLIENT_SECRET = process.env.FAKEBAY_CLIENT_SECRET;
const FAKEBAY_REDIRECT_URI = process.env.FAKEBAY_REDIRECT_URI;

export default router;