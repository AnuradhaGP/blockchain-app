'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const {verifyApiKey} = require('./middleware/auth');

const fabricRoutes = require('./routes/fabricRoutes');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
require('dotenv').config();

const io = new Server(server, {
    cors: {

        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});

// Security middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

//Rate limiting to prevent Jenkins spams
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    message: { error: 'Too many requests.' }
});
app.use(limiter);

app.set('socketio', io);
app.use('/api/v1/', verifyApiKey ,fabricRoutes)

//Health check 
app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
    console.log('a user connected to dashboard');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


const PORT = process.env.PORT;
const HOST = "0.0.0.0";
server.listen(PORT, HOST, async () => {
    console.log(`BCAI blockchain server running on port :${HOST}:${PORT}`);

   
});
