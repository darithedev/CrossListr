import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
    if(!JWT_SECRET) {
        return res.status(500),json({ error: "JWT secret is required. Please configure."})
    }
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Missing authorization header!' });

        } else if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: 'Invalid authorization header!'});

        } else {
            const token = authHeader.slice(7);
            const decoded = jwt.verify(token, JWT_SECRET);
            req.userId = decoded.userId;
        }
        next();
    } catch (error) {
        console.error('Error with obtaining valid token!', error);
        return res.status(401).json({ error: 'Error! authorization header is missing or invalid.' });
    }
}

export default authMiddleware;