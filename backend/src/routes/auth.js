import express from 'express'
import pool from '../db/pools.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                error: 'Error logging in to account!'
            });
        }

        const user = result.rows[0]
        const loginResult = await bcrypt.compare(password, user.password);

        if (!loginResult) {
            return res.status(400).json({
                error: 'Email or password is invalid! Please try again.'
            });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Error with login!', error);
        res.status(500).json({ error: 'Error! Could not login user.' });

    }
});

router.post('/signup', async (req, res) => {
    try {
        const { name, phone_number, email, password } = req.body;

        const passwordBcrypt = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, phone_number, email, password)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, phone_number, email`,
            [name, phone_number, email, passwordBcrypt]
        );

        const user = result.rows[0];

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token, user });
    } catch (error) {
        console.error('Error with signup!', error);
        res.status(500).json({ error: 'Error! Could not signup user.' });
    }
});

export default router;