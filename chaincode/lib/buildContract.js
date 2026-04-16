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
      *Record a new build.
      *This function stores the immutable proof of a CI/CD build.
     */
    async recordBuild(ctx, buildId, artifactHash, logHash, logCid, buildBy) {
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
     * This function ensures that the artifact hashes and log hashes matches with the hashes stored in the blockchain.
     */
    async verifyArtifact(ctx, buildId, currentArtifactHash, currentLogHash) {
        // Retrieve the original record from the ledger
        const exists = await this.buildExists(ctx, buildId);
        if (!exists) {
            throw new Error(`The build ${buildId} does not exist`);
        }

        const buildBuffer = await ctx.stub.getState(buildId);
        const build = JSON.parse(buildBuffer.toString());

        // Compare the current artifact's hash with the stored hash on the Blockchain
        if (build.artifactHash !== currentArtifactHash) {
            throw new Error(
            `TAMPER DETECTED: Artifact hash mismatch! Expected ${build.artifactHash}, got ${currentArtifactHash}`
            );
           
        }
        // Compare the current log hash with the stored hash on the Blockchain
        if (build.logHash !== currentLogHash) {
            throw new Error(
            `TAMPER DETECTED: Log hash mismatch! Expected ${build.logHash}, got ${currentLogHash}`
        );
           
        }

         return JSON.stringify({
                status: 'VERIFIED',
                buildId,
                message: 'Artifact and Log hash matches',
                logCid: build.logCid,
                timestamp: build.timestamp
            }); // OK to Deploy
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
