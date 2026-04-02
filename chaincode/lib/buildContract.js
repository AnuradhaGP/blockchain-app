'use strict';

const { Contract } = require('fabric-contract-api');

class BuildContract extends Contract {

    /**
     * Initialize the ledger with genesis data.
     * This function is called when the chaincode is first instantiated.
     * @param {Context} ctx - The transaction context.
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        // Initial dummy data to verify the ledger is working
        const builds = [
            {
                buildId: 'BUILD-INIT-001',
                artifactHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Empty SHA-256 hash (placeholder)
                logHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG', // Dummy IPFS hash
                status: 'Initial',
                timestamp: '2024-01-01T00:00:00.000Z'
            }
        ];

        // Loop through the initial data and commit it to the ledger
        for (const build of builds) {
            build.docType = 'build'; // DocType helps in querying specifically for build records
            await ctx.stub.putState(build.buildId, Buffer.from(JSON.stringify(build))); // putState writes to the Fabric ledger
            console.info(`Added <--> ${build.buildId}`);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Record a new build.
     * This function stores the immutable proof of a CI/CD build.
     * @param {Context} ctx 
     * @param {String} buildId - Unique ID of the build (e.g. Jenkins Build #)
     * @param {String} artifactHash - SHA-256 Hash of the artifact (Ensures Integrity)
     * @param {String} logHash - IPFS Hash (CID) of the build logs (Ensures Auditability)
     */
    async recordBuild(ctx, buildId, artifactHash, logHash, logCid, artifactCid, buildBy) {
        console.info('============= START : Record Build ===========');

        // Check if the build ID already exists to prevent overwriting (Immutability check)
        const exists = await this.buildExists(ctx, buildId);
        if (exists) {
            throw new Error(`The build ${buildId} already exists`);
        }

        const txTimestamp = ctx.stub.getTxTimestamp();
        const timestamp = new Date(txTimestamp.seconds * 1000).toISOString();

        // Create the build object to be stored
        const build = {
            docType: 'build',
            buildId,
            artifactHash,
            logHash,
            artifactCid,
            logCid,
            timestamp: timestamp, // Record when it was stored
            buildBy: buildBy,
        };

        // Write the data to the blockchain ledger
        await ctx.stub.putState(buildId, Buffer.from(JSON.stringify(build)));
        console.info('============= END : Record Build ===========');
        return JSON.stringify(build);
    }

    /**
     * Verify Artifact Integrity
     * Logic: Status = { Deploy Proceed if H_Artifact == H_Ledger, Tamper Detected if H_Artifact != H_Ledger }
     * This function ensures that the artifact about to be deployed matches exactly what was built.
     * @param {Context} ctx 
     * @param {String} buildId - Unique ID of the build to verify
     * @param {String} currentHash - The calculated hash of the artifact currently in the deployment stage
     */
    async verifyArtifact(ctx, buildId, currentHash) {
        // Retrieve the original record from the ledger
        const exists = await this.buildExists(ctx, buildId);
        if (!exists) {
            throw new Error(`The build ${buildId} does not exist`);
        }

        const buildBuffer = await ctx.stub.getState(buildId);
        const build = JSON.parse(buildBuffer.toString());

        // Compare the current artifact's hash with the stored hash on the Blockchain
        if (build.artifactHash === currentHash) {
            JSON.stringify({
                status: 'VERIFIED',
                buildId,
                message: 'Artifact hash matches',
                logCid: build.logCid,
                artifactCid: build.artifactCid,
                timestamp: build.timestamp
            }); // OK to Deploy
        } else {
            // Critical Security Failure: The artifact has been tampered with!
            throw new Error(`TAMPER DETECTED: Artifact Hash Mismatch! Blockchain has ${build.artifactHash}, but received ${currentHash}`);
        }
    }

    /**
     * Returns the full history of modifications for a specific build record.
     * Useful for auditing who changed what and when.
     */
    async getBuildHistory(ctx, buildId) {
        const historyIterator = await ctx.stub.getHistoryForKey(buildId);
        const allHistory = [];

        let result = await historyIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            // Create a history record with transaction ID and timestamp
            allHistory.push({
                TxId: result.value.tx_id, // The specific transaction ID that made the modification
                Timestamp: result.value.timestamp, // When it happened
                IsDelete: result.value.is_delete, // Was it a delete operation?
                Record: record // The state of the asset after the transaction
            });
            result = await historyIterator.next();
        }
        await historyIterator.close();
        return JSON.stringify(allHistory);
    }

    /**
     * Query all builds to populate the Dashboard.
     * Iterates over all keys in the ledger and returns the data.
     */
    async queryAllBuilds(ctx) {
        const startKey = '';
        const endKey = '';
        const allResults = [];
        // Iterate through all records in the State Database
        for await (const { key, value } of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    async buildExists(ctx, buildId) {
        const buildJSON = await ctx.stub.getState(buildId);
        return buildJSON && buildJSON.length > 0;
    }
}

module.exports = BuildContract;
