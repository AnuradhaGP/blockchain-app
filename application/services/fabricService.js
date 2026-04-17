require('dotenv').config();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const { buildCCPOrg1, buildWallet } = require('../utils/AppUtil');

const channelName = process.env.CHANNEL_NAME;
const chaincodeName = 'basic';
const walletPath = path.join(__dirname, '..', 'wallet');
const userId = 'appUser';

class FabricService {
    // establishes the connection to the Fabric network Gateway
    async getContract() {
        // Load the Connection Profile (Network Config)
        const ccp = buildCCPOrg1();
        // Load the Wallet (User Identity)
        const wallet = await buildWallet(Wallets, walletPath);
        const gateway = new Gateway();
        //Connect to the Gateway
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true },// 'asLocalhost: true' is for Docker local testing
            eventHandlerOptions: {
            commitTimeout : 300,
            endorseTimeout: 300
            },
            'grpc-wait-for-ready-timeout': 10000,
            'grpc.keepalive_time_ms'      : 10000,
            'grpc.keepalive_timeout_ms'   : 5000,
        });
        // Get the Channel and Contract
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        return { contract, gateway };
    }

    async recordBuild(buildId, artifactHash, logHash,logCid,buildBy) {
        const { contract, gateway } = await this.getContract();
        try {
            await contract.submitTransaction('recordBuild', buildId, artifactHash, logHash,logCid,buildBy);
        }
        finally {

            await gateway.disconnect();
        }
    }

    async verifyArtifact(buildId, currentArtifactHash, currentLogHash) {
        const { contract, gateway } = await this.getContract();
        try{
            const result = await contract.evaluateTransaction(
                'verifyArtifact',
                buildId,
                currentArtifactHash,
                currentLogHash
            );
            return result.toString();
        }
        finally{
            await gateway.disconnect();
        }
    }


    async getAllBuilds() {
        const { contract, gateway } = await this.getContract();
        try {
            const result = await contract.evaluateTransaction('queryAllBuilds');
            return JSON.parse(result.toString());
        }
        finally{
            await gateway.disconnect();

        }
    }
}

module.exports = new FabricService();