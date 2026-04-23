import express from 'express'
import pool from '../db/pools.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('login', async (req, res) => {
    try {

    } catch (error) {

    }
});

export default router;