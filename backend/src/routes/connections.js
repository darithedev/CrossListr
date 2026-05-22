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

router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        if (userId === null) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        }

        const result = await pool.query(
            `SELECT marketplaces.name
            FROM marketplace_connections
            JOIN marketplaces ON marketplaces.id = marketplace_connections.marketplace_id
            WHERE marketplace_connections.user_id = $1`,
            [userId]
        );

        return res.status(200).json(results.rows);
    } catch (error) {
        console.error('GET /connections failed:', error);
        return res.status(500).json({
            error: 'Error! Could not get connections.'
        });
    }
});

export default router;