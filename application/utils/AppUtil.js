/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Helper to load the Connection Profile (CCP)
// The CCP contains network details like Peer URLs, Channel info, etc.
exports.buildCCPOrg1 = () => {
    // load the common connection configuration file
    const ccpPath = path.resolve(__dirname, '..', '..','..','fabric-samples','test-network','organizations','peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const fileExists = fs.existsSync(ccpPath);
    if (!fileExists) {
        throw new Error(`no such file or directory: ${ccpPath}`);
    }
    const contents = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(contents);
    console.log(`Loaded the network configuration located at ${ccpPath}`);
    return ccp;
};

// Helper to build the Wallet from the file system.
// The wallet stores the definition of the digital identity (X.509 certs).
exports.buildWallet = async (Wallets, walletPath) => {
    // Create a new file system based wallet for managing identities.
    let wallet;
    if (walletPath) {
        wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Built a file system wallet at ${walletPath}`);
    } else {
        wallet = await Wallets.newInMemoryWallet();
        console.log('Built an in memory wallet');
    }

    return wallet;
};

exports.prettyJSONString = (inputString) => {
    if (inputString) {
        return JSON.stringify(JSON.parse(inputString), null, 2);
    } else {
        return inputString;
    }
}
