'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('./utils/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('./utils/AppUtil.js');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(bodyParser.json());
app.use(cors());

io.on('connection', (socket) => {
    console.log('a user connected to dashboard');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const channelName = 'mychannel11';
const chaincodeName = 'basic'; // Ensure this matches deployCC name
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const userId = 'appUser';

// Helper to get contract instance
// This function establishes the connection to the Fabric network Gateway
async function getContract() {
    // 1. Load the Connection Profile (Network Config)
    const ccp = buildCCPOrg1();

    // 2. Load the Wallet (User Identity)
    const wallet = await buildWallet(Wallets, walletPath);
    const gateway = new Gateway();

    // 3. Connect to the Gateway
    await gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost: true } // 'asLocalhost: true' is key for Docker local testing
    });

    // 4. Get the Channel and Contract
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);
    return { contract, gateway };
}

// 1. Record Build (Called by Jenkins Post-Build)
// This endpoint receives build data from Jenkins and commits it to the Blockchain.
app.post('/record', async (req, res) => {
    try {
        const { buildId, artifactHash, logIpfsHash } = req.body;
        console.log(`Submitting Record Build: ${buildId}`);

        const { contract, gateway } = await getContract();

        // submitTransaction sends a proposal to peers, collects endorsements, and sends to orderer.
        // It waits for the transaction to be committed to the ledger.
        await contract.submitTransaction('recordBuild', buildId, artifactHash, logIpfsHash);

        console.log('Transaction has been submitted');
        await gateway.disconnect();

        res.status(200).json({ status: 'Success', message: `Build ${buildId} Recorded` });
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: error.message });
    }
});

// 2. Verify Artifact (Called by Jenkins Pre-Deployment)
// This endpoint checks if the artifact deployed matches the immutable record in Blockchain.
// Real-time alerts are sent via Socket.io if tampering is detected.
app.post('/verify', async (req, res) => {
    const { buildId, currentHash } = req.body;
    try {
        console.log(`Verifying Build: ${buildId} with Hash: ${currentHash}`);

        const { contract, gateway } = await getContract();

        // evaluateTransaction only queries the peer and does NOT submit a transaction to the Orderer.
        // It is faster and used for reading data or logic checks that don't change state.
        const result = await contract.evaluateTransaction('verifyArtifact', buildId, currentHash);

        console.log(`Verification Result: ${result.toString()}`);
        await gateway.disconnect();

        // If verification passes, notify dashboard
        io.emit('verification_success', { buildId, message: result.toString() });
        res.status(200).json({ status: 'Verified', message: result.toString() });
    } catch (error) {
        console.error(`Verification Failed: ${error}`);

        // Real-time Alerting as per Requirement 2.1
        // If the error message indicates tampering, send a critical alert
        if (error.message.includes('TAMPER DETECTED')) {
            io.emit('tamper_alert', {
                buildId,
                error: error.message,
                timestamp: new Date().toISOString(),
                severity: 'CRITICAL'
            });
        }

        res.status(400).json({ status: 'Failed', error: error.message });
    }
});

// 3. Get History (For Auditor)
app.get('/history/:buildId', async (req, res) => {
    try {
        const buildId = req.params.buildId;
        const { contract, gateway } = await getContract();
        const result = await contract.evaluateTransaction('getBuildHistory', buildId);

        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Get All Builds (For Dashboard)
app.get('/all', async (req, res) => {
    try {
        const { contract, gateway } = await getContract();
        const result = await contract.evaluateTransaction('queryAllBuilds');

        await gateway.disconnect();
        res.status(200).json(JSON.parse(result.toString()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
server.listen(PORT, async () => {
    console.log(`Build Integrity API & Socket.io listening at http://localhost:${PORT}`);

   
});
