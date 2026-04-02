'use strict';

const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key missing' });
    }

    if (apiKey !== process.env.JENKINS_API_KEY) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    next();
};

module.exports = { verifyApiKey };