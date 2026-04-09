require('dotenv').config();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const { buildCCPOrg1, buildWallet } = require('../utils/AppUtil');

const channelName = process.env.CHANNEL_NAME;
const chaincodeName = 'basic';
const walletPath = path.join(__dirname, '..', 'wallet');
const userId = 'appUser';

class FabricService {
    // This function establishes the connection to the Fabric network Gateway
    async getContract() {
        // 1. Load the Connection Profile (Network Config)
        const ccp = buildCCPOrg1();
        // 2. Load the Wallet (User Identity)
        const wallet = await buildWallet(Wallets, walletPath);
        const gateway = new Gateway();
        // 3. Connect to the Gateway
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true }// 'asLocalhost: true' is key for Docker local testing
        });
        // 4. Get the Channel and Contract
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

    async getHistory(buildId) {
        const { contract, gateway } = await this.getContract();
        try{
            const result = await contract.evaluateTransaction('getBuildHistory', buildId);
            return JSON.parse(result.toString());
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