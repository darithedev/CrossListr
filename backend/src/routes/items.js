import express from 'express'
import pool from '../db/pools.js'
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, async(req, res) => {
    try {
        const userId = req.userId;

        if (userId === null) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        }

        const { title, description, category, condition, price, item_images, source, external_id } = req.body;

        if (!title || !description || !category || !condition || !price || !source) {
            return res.status(400).json({
                error: "A title. description, category, price, and source is required!"
            });
        };

        const result = await pool.query(
            `INSERT INTO items (user_id, title, description, category, condition, price, item_images, source, external_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING 
                items.id,
                items.user_id,
                items.title,
                items.description, 
                items.category, 
                items.condition, 
                items.price, 
                items.item_images,
                items.source, 
                items.external_id,
                items.created_at,
                items.updated_at
            `,
            [userId, title, description, category, condition, price, item_images, source, external_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('POST /items failed:', error.message);
        res.status(500).json({ error: 'Error! Could not create item.' });
    }
});

export default router;