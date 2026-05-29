import pool from '../db/pools.js';

const FAKEBAY_API_URL = process.env.FAKEBAY_API_URL;
const FAKEBAY_CLIENT_ID = process.env.FAKEBAY_CLIENT_ID;
const FAKEBAY_CLIENT_SECRET = process.env.FAKEBAY_CLIENT_SECRET;

export async function getFakebayAccessToken(userId) {
    const result = await pool.query(
        `SELECT marketplace_connections.access_token,
                marketplace_connections.refresh_token,
                marketplace_connections.access_expires_at,
                marketplace_connections.refresh_expires_at,
                marketplaces.id AS marketplace_id
         FROM marketplace_connections
         JOIN marketplaces ON marketplaces.id = marketplace_connections.marketplace_id
         WHERE marketplace_connections.user_id = $1 AND marketplaces.name = 'fakebay'`,
        [userId]
    );

    if (result.rows.length === 0) {
        return;
    }

    const row = result.rows[0];

    if (new Date() < new Date(row.access_expires_at)) {
        return row;
    }

    if (!row.refresh_token || new Date() >= new Date(row.refresh_expires_at)) {
        return;
    }

    const response = await fetch(`${FAKEBAY_API_URL}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${FAKEBAY_CLIENT_ID}:${FAKEBAY_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: row.refresh_token,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('FakeBay refresh failed:', data);
        return;
    }

    const accessExpiration = new Date(Date.now() + data.expires_in * 1000);
    const refreshExpiration = new Date(Date.now() + data.refresh_token_expires_in * 1000);

    await pool.query(
        `UPDATE marketplace_connections
         SET access_token = $1,
             access_expires_at = $2,
             refresh_expires_at = $3,
             updated_at = NOW()
         WHERE user_id = $4 AND marketplace_id = $5`,
        [data.access_token, accessExpiration, refreshExpiration, userId, row.marketplace_id]
    );

    row.access_token = data.access_token;

    return row;
}