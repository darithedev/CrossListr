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

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('GET /connections failed:', error);
        return res.status(500).json({
            error: 'Error! Could not get connections.'
        });
    }
});

router.get('/:marketplace/callback', async (req, res) => {
    try {
        const { marketplace } = req.params;
        const code = req.query.code;
        const state = req.query.state;

        const decoded = jwt.verify(state, JWT_SECRET);
        const userId = decoded.userId;

        const token = await fetch(`${FAKEBAY_API_URL}/identity/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${FAKEBAY_CLIENT_ID}:${FAKEBAY_CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: FAKEBAY_REDIRECT_URI,
            })
        });

        const tokenData = await token.json();

        const marketplaceResult = await pool.query(
            `SELECT id FROM marketplaces WHERE name = $1`,
            [marketplace]
        );

        const marketplaceId = marketplaceResult.rows[0].id;
        const accessExpiration = new Date(Date.now() + tokenData.expires_in * 1000);
        const refreshExpiration = new Date(Date.now() + tokenData.refresh_token_expires_in * 1000);

        await pool.query(
            `INSERT INTO marketplace_connections (user_id, marketplace_id, access_token, refresh_token, access_expires_at, refresh_expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, marketplaceId, tokenData.access_token, tokenData.refresh_token, accessExpiration, refreshExpiration]
        );

        return res.redirect(`${FRONTEND_URL}/settings`);
    } catch (error) {
        console.error('GET /connections/:marketplace/callback failed:', error);
        return res.redirect(`${FRONTEND_URL}/settings?fakebay_connected=false`);
    }
});
export default router;