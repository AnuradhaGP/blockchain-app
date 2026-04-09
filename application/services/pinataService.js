'use strict';

const axios = require('axios');
const FormData = require('form-data');
const encryptionService = require('./encryptionService');

const PINATA_API = 'https://api.pinata.cloud';

class PinataService {

    /**
     * encrypt Build log then upload to Pinata
     * Return: { logCid, logHash }
     */
    async uploadLog(logContent, buildId) {
        const logBuffer = Buffer.from(logContent, 'utf8');

        // Hash
        const logHash = encryptionService.hashData(logBuffer);

        // Encrypt
        const { encryptedData, iv, authTag } = encryptionService.encrypt(logBuffer);

        const encryptedBuffer = Buffer.from(encryptedData, 'base64');

        // Pinata upload
        const fileName = `log-${buildId}.enc`;
        const logCid = await this._uploadToIPFS(
            encryptedBuffer,
            fileName,
            {
                buildId,
                type    : 'log',
                iv,
                authTag,
            }
        );

        return { logCid, logHash };
    }

    /**
     * download files from pinata and decrypy
     * get iv and authtag from pinata
     */
    async downloadAndDecrypt(cid) {
        // get iv and authTag from metadata
        const metadata = await this._getMetadata(cid);
        const { iv, authTag } = metadata.keyvalues;

        if (!iv || !authTag) {
            throw new Error('iv or authTag missing from Pinata metadata');
        }

        //  Encrypted file download
        const response = await axios.get(
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            {
                responseType: 'arraybuffer',
                headers: { Authorization: `Bearer ${this._getJwt()}` }
            }
        );

        const encryptedBuffer = Buffer.from(response.data);

        //  Decrypt
        const decrypted = encryptionService.decrypt(
            encryptedBuffer.toString('base64'),
            iv,
            authTag
        );

        return decrypted;
    }

    // #### Private Methods #######

    /**
     * Buffer to Pinata IPFS uploads
     * iv and authTag save in metadata
     */
    async _uploadToIPFS(buffer, fileName, keyvalues) {
        const jwt = this._getJwt();

        const form = new FormData();
        form.append('file', buffer, { filename: fileName });

        // save Pinata metadata( iv, authTag, buildId)
        form.append('pinataMetadata', JSON.stringify({
            name     : fileName,
            keyvalues,          // iv + authTag 
        }));

        form.append('pinataOptions', JSON.stringify({
            cidVersion: 1
        }));

        const response = await axios.post(
            `${PINATA_API}/pinning/pinFileToIPFS`,
            form,
            {
                headers: {
                    Authorization            : `Bearer ${jwt}`,
                    ...form.getHeaders(),
                },
                maxBodyLength: Infinity,  // large files handle 
            }
        );

        if (!response.data?.IpfsHash) {
            throw new Error('Pinata upload failed: no CID returned');
        }

        return response.data.IpfsHash;
    }

    /**
     * fetch Pinata metadata from CID
     * fetch iv and authTag
     */
    async _getMetadata(cid) {
        const jwt = this._getJwt();

        const response = await axios.get(
            `${PINATA_API}/data/pinList?hashContains=${cid}`,
            { headers: { Authorization: `Bearer ${jwt}` } }
        );

        const rows = response.data?.rows;
        if (!rows || rows.length === 0) {
            throw new Error(`No Pinata metadata found for CID: ${cid}`);
        }

        return rows[0].metadata;
    }

    /** 
    * get pinata JWT from .env
    */
    _getJwt() {
        const jwt = process.env.PINATA_JWT;
        if (!jwt) throw new Error('PINATA_JWT not set in .env');
        return jwt;
    }
}

module.exports = new PinataService();