import express from 'express'
import pool from '../db/pools.js'
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;

        if (userId === null) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        }

        const result = await pool.query(
            `SELECT 
                items.id, 
                items.title, 
                items.description, 
                items.category, 
                items.condition, 
                items.price, 
                items.item_images,
                items.source, 
                items.external_id,
                items.created_at,
                items.updated_at,
                users.name 
                AS listed_by
            FROM items
            JOIN users ON items.user_id = users.id
            WHERE users.id = $1;`,
            [userId]
        );

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('GET /items failed:', error);
        return res.status(500).json({
            error: 'Error! Could not get all items.'
        });
    }
});

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

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.userId;
        const { id } = req.params;

        if (userId === null) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        } else if (id === null || isNaN(id)) {
            return res.status(400).json({
                error: 'Invalid item id.'
            })
        }

        const result = await pool.query(
            `SELECT 
                items.id,
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
            WHERE items.id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'This item does not exist.'
            });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('GET /items/:id failed:', error);
        return res.status(500).json({
            error: 'Error! Could not get item.'
        });
    }
});

router.put('/:id', authMiddleware, async (req,res) => {
    try {
        const { userId } = req.userId;
        const { id } = req.params;
        const { title, description, category, condition, price, item_images, source, externl_id} = req.body;

        if (userId === null) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        } else if (id === null) {
            return res.status(400).json({
                error: 'Could not find item.'
            });
        }

        if (isNaN(userId) || isNaN(id)) {
            return res.status(400).json({error: 'Invalid user id or item id.'});
        };

        if (!title || !description || !price) {
            return res.status(400).json({error: 'Title, description, and price are required fields.'});
        };

        const result = await pool.query(
            `UPDATE items 
            SET title = $1, description = $2, category = $3, condition = $4, price = $5, item_images = $6, source = $7, external_id = $8
            WHERE user_id = $9 AND id = $10
            RETURNING 
                items.id,
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
            [title, description, category, condition, price, item_images, source, externl_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found.' });
        };
        
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('PUT /items/:id failed:', error);
        return res.status(500).json({
            error: 'Error! Could not update item.'
        });
    }
});

export default router;