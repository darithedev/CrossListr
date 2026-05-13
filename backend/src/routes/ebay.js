import express from 'express'
import pool from '../db/pools.js'
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Routor();

routor.post('/auth', authMiddleware, async (req, res) => {
    try {

    } catch (error) {
        
    }
});

routor.get('/callback', authMiddleware, async (req, res) => {
    try {

    } catch (error) {
        
    }
});

export default router;