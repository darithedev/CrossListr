import pool from '../db/pools.js'

const dbHealth = async (req, res) => {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Error:', error.message);
        return false;
    }
}

export default dbHealth;