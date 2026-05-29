import express from 'express'
import pool from '../db/pools.js'
import authMiddleware from '../middleware/authMiddleware.js';
import { getFakebayAccessToken } from '../services/marketplaceTokens.js';

const router = express.Router();

const marketplaces = ['fakebay', 'faketsy', 'fakify'];

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
                items.source, 
                items.external_id,
                items.created_at,
                items.updated_at,
                item_images.id AS image_id,
                item_images.image_url,
                item_images.index_number
            FROM items
            LEFT JOIN item_images ON item_images.item_id = items.id
            WHERE items.user_id = $1
            ORDER BY items.id, item_images.index_number`,
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

        const { title, description, category, condition, price, source, external_id } = req.body;

        if (!title || !description || !category || !condition || !price || !source) {
            return res.status(400).json({
                error: "A title. description, category, price, and source is required!"
            });
        };

        const result = await pool.query(
            `INSERT INTO items (user_id, title, description, category, condition, price, source, external_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING
                items.id`,
            [userId, title, description, category, condition, price, source, external_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('POST /items failed:', error.message);
        res.status(500).json({ error: 'Error! Could not create item.' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        } 
        
        if (!id || isNaN(Number(id))) {
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
                items.source, 
                items.external_id,
                items.created_at,
                items.updated_at,
                item_images.id AS image_id,
                item_images.image_url,
                item_images.index_number
            FROM items
            LEFT JOIN item_images ON item_images.item_id = items.id
            WHERE items.id = $1 AND items.user_id = $2
            ORDER BY item_images.index_number ASC`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'This item does not exist.'
            });
        }

        const rowObj = result.rows[0];
        const images = result.rows
            .filter((row) => row.image_url != null)
            .map((row) => ({
                image_id: row.image_id,
                url: row.image_url,
                index: row.index_number
            }))
            .sort((a, b) => a.index - b.index);

        const item = {
            id: rowObj.id,
            title: rowObj.title,
            description: rowObj.description,
            category: rowObj.category,
            condition: rowObj.condition,
            price: rowObj.price,
            source: rowObj.source,
            external_id: rowObj.external_id,
            created_at: rowObj.created_at,
            updated_at: rowObj.updated_at,
        };

        return res.status(200).json({ ...item, images });
    } catch (error) {
        console.error('GET /items/:id failed:', error);
        return res.status(500).json({
            error: 'Error! Could not get item.'
        });
    }
});

router.put('/:id', authMiddleware, async (req,res) => {
    try {
        const userId  = req.userId;
        const { id } = req.params;
        const { title, description, category, condition, price, source, external_id} = req.body;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        }
            
        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: 'Invalid item id.'
            });
        }

        if (!title || !description || !price) {
            return res.status(400).json({error: 'Title, description, and price are required fields.'});
        };

        const result = await pool.query(
            `UPDATE items 
            SET 
                title = $1,
                description = $2,
                category = $3,
                condition = $4,
                price = $5,
                source = $6,
                external_id = $7,
                updated_at = NOW()
            WHERE user_id = $8 AND id = $9
            RETURNING 
                items.id,
                items.title,
                items.description,
                items.category, 
                items.condition, 
                items.price, 
                items.source, 
                items.external_id,
                items.created_at,
                items.updated_at
            `,
            [title, description, category, condition, price, source, external_id, userId, id]
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

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        
        if (!userId) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        } 

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: 'invalid item id.'
            });
        }

        const result = await pool.query(
            `DELETE FROM items 
            WHERE user_id = $1 
                AND id = $2
                AND status = 'draft'
            RETURNING items.id, items.title`,
            [userId, id]
        );

        if (result.rows.length > 0) {
            return res.status(200).json(result.rows[0]);
        };

        const existingResult = await pool.query(
            `SELECT id, status FROM items WHERE user_id = $1 AND id = $2`,
            [userId, id]
        );

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item was not found.' });
        }

        return res.status(409).json({
            error: 'Items with listings cannot be deleted.'
        });
    } catch (error) {
        console.error('DELETE /items/:id failed:', error);
        return res.status(500).json({
            error: 'Could not delete this item.'
        });
    }
});

router.get('/:id/images', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        }

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: 'Invalid item id.'
            });
        }

        const itemCheck = await pool.query(
            `SELECT 1 FROM items WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )
        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found.' })
        }

        const result = await pool.query(
            `SELECT 
                image_url,
                index_number AS index
            FROM item_images
            WHERE item_id = $1
            ORDER BY index_number ASC`,
            [id]
        );

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('GET /items/:id/images failed:', error.message);
        res.status(500).json({ error: 'Error! Could not get images for this item.' });
    }
});

router.post('/:id/images', authMiddleware, async(req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { image_url, index_number } = req.body;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        }

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: 'Invalid item id.'
            });
        }

        const itemCheck = await pool.query(
            `SELECT 1 FROM items WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Item not found for this user."
            })
        }

        if (!image_url || index_number === undefined || index_number === null) {
            return res.status(400).json({
                error: "An image url and index number is required!"
            });
        };

        if (Number(index_number) < 0 || Number(index_number) > 11) {
            return res.status(400).json({
                error: 'Index must be between 0 and 11 (max 12 images).'
            });
        }

        const result = await pool.query(
            `INSERT INTO item_images (item_id, image_url, index_number)
            VALUES ($1, $2, $3)
            RETURNING id, item_id, image_url, index_number, created_at, updated_at`,
            [id, image_url, index_number]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('POST /items/:id/images failed:', error.message);
        res.status(500).json({ error: 'Error! Could not add image for this item.' });
    }
});

router.delete('/:id/images/:image_id', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { id, image_id } = req.params;
        
        if (!userId) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        } 

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: 'invalid item id.'
            });
        }

        if (!image_id || isNaN(Number(image_id))) {
            return res.status(400).json({
                error: 'invalid item image id.'
            });
        }

        const itemCheck = await pool.query(
            `SELECT id, status FROM items WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Item not found for this user."
            });
        }

        if (itemCheck.rows[0].status !== 'draft') {
            return res.status(409).json({
                error: "Image added to an item with an active listing cannot be deleted."
            });
        }

        const result = await pool.query(
            `DELETE FROM item_images 
            WHERE item_id = $1 AND id = $2
            RETURNING item_images.id`,
            [id, image_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Image was not found for this item.' 
            });
        }

        // Get all for this item, ordered by index number
        const images = await pool.query(
            `SELECT id FROM item_images
            WHERE item_id = $1 
            ORDER BY index_number ASC, id ASC`,
            [id]
        );

        // Renumbers images so index is contiguous after delete 
        for (let i = 0; i < images.rows.length; i++) {
            await pool.query(
                `UPDATE item_images
                SET index_number = $1, updated_at = NOW()
                WHERE id = $2`,
                [i, images.rows[i].id]
            );
        };

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('DELETE /items/:id/images/:image_id failed:', error);
        return res.status(500).json({
            error: 'Could not delete this image.'
        });
    }
});

router.post('/:id/crosslist/:marketplace', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { id, marketplace } = req.params;

        if (!userId) {
            return res.status(401).json({
                error: 'Unauthenticated user.'
            });
        } 

        if (!id || isNaN(Number(id))) {
            return res.status(400).json({
                error: 'Invalid item id.'
            });
        }

        if (!marketplaces.includes(marketplace)) {
            return res.status(400).json({
                error: 'Invalid marketplace name.'
            });
        }

        // Checks if item is owned by user and select required fields for listing
        const itemCheck = await pool.query(
            `SELECT
                items.id,
                items.title, 
                items.description, 
                items.category, 
                items.condition, 
                items.price,
                items.status,
                item_images.id AS image_id,
                item_images.image_url,
                item_images.index_number
            FROM items 
            LEFT JOIN item_images ON item_images.item_id = items.id
            WHERE items.id = $1 AND items.user_id = $2
            ORDER BY item_images.index_number ASC`,
            [id, userId]
        );

        if (itemCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Item not found for this user."
            });
        }

        const rowObj = itemCheck.rows[0];

        const images = itemCheck.rows
            .filter((row) => row.image_url != null)
            .map((row) => ({
                image_id: row.image_id,
                url: row.image_url,
                index: row.index_number
            }))
            .sort((a, b) => a.index - b.index);

        const listing = {
            id: rowObj.id,
            images,
            title: rowObj.title,
            description: rowObj.description,
            category: rowObj.category,
            condition: rowObj.condition,
            price: rowObj.price,
            status: rowObj.status
        };

        if (listing.status === 'listed') {
            return res.status(409).json({
                error: 'This item is already listed.',
            });
        }

        if (marketplace === 'fakebay') {

            const connection = await getFakebayAccessToken(userId);

            if (!connection) {
                return res.status(403).json({
                    error: "Marketplace is not connected."
                });
            }

            const { access_token, marketplace_id } = connection;

            const response = await fetch(`http://fakebay-backend:8082/api/v1/seller/listings`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: listing.title,
                    description: listing.description || '',
                    priceCents: Math.round(Number(listing.price) * 100),
                    currency: 'USD',
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('POST /items/:id/crosslist/:marketplace failed:', data);
                return res.status(500).json({
                    error: 'Error! Could not crosslist this item.'
                });
            }

            const externalId = String(data.id);

            await pool.query(
                `INSERT INTO listings (item_id, marketplace_id, status, external_id)
                VALUES ($1, $2, $3, $4)`,
                [id, marketplace_id, 'listed', externalId]
            );

            await pool.query(
                `UPDATE items SET status = 'listed', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
                [id, userId]
            );

            return res.status(200).json({
                marketplace,
                status: 'listed',
                external_id: externalId,
            });
        } else if (marketplace === 'faketsy') {
            return res.status(501).json({
                error: 'Crosslisting to Faketsy is not yet available.',
            });
        } else if (marketplace === 'fakify') {
            return res.status(501).json({
                error: 'Crosslisting to Fakify is not yet available.',
            });
        }

        return res.status(501).json({
            error: `Crosslisting to marketplace ${marketplace} is not yet available.`,
        });
    } catch (error) {
        console.error('POST /items/:id/crosslist/:marketplace failed:', error);
        return res.status(500).json({
            error: 'Error! Could not crosslist this item.'
        });
    }
});

export default router;
