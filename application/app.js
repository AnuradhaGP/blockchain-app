'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fabricRoutes = require('./routes/fabricRoutes');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
require('dotenv').config();

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(bodyParser.json());
app.use(cors());
app.use('api/v1/',fabricRoutes)

io.on('connection', (socket) => {
    console.log('a user connected to dashboard');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


const PORT = process.env.PORT;
server.listen(PORT, async () => {
    console.log(`BCAI blockchain server running on port :${PORT}`);

   
});
