import express from 'express'
import cors from 'cors'
import dbHealth from './helpers/dbHealth.js'
import router from './routes/index.js'

const app = express();

const PORT = process.env.PORT;
const LISTEN_HOST = process.env.LISTEN_HOST ?? '127.0.0.1';

app.use(express.json());
app.use(cors());
app.use('/api/v1', router);

app.get('/health', async (req, res) => {
    const db_status = await dbHealth();

    if (db_status) {
        res.status(200).json({
            message: 'Express server is healthy. Postgres database connection is healthy.',
            server: 'up',
            database: 'up'
        });
    } else {
        res.status(500).json({
            message: 'Express server is healthy. Postgres database connection is down.',
            server: 'up',
            database: 'down'
        });
    }
});

app.listen(PORT, LISTEN_HOST, async () => {
    if (await dbHealth()) {
        console.log(`Express server is running on port ${PORT}`);
    } else {
        console.error(`Error! The database is down. Restart database and server.`);
        process.exit(1);
    }
});
