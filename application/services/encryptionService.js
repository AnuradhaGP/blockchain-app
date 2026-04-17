'use strict';

const crypto = require('crypto');

const ALGORITHM   = 'aes-256-gcm';
const KEY_LENGTH  = 32;  // 256 bits
const IV_LENGTH   = 12;  // 96 bits - GCM recommended
const TAG_LENGTH  = 16;  // 128 bits auth tag

class EncryptionService {

    //Encryption of buffer or string 
    encrypt(data) {
        //get the key fom .env
        const key = this._getKey();

        // generate random IV. every encrypt need fresh IV 
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // String or Buffer handle both
        const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

        const encrypted = Buffer.concat([
            cipher.update(inputBuffer),
            cipher.final()
        ]);

        // GCM auth tag for tamper detection
        const authTag = cipher.getAuthTag();

        return {
            encryptedData : encrypted.toString('base64'),
            iv            : iv.toString('base64'),
            authTag       : authTag.toString('base64'),
        };
    }

    // Decryption
    //if authTag mismatch occurs automatically throw error
    decrypt(encryptedData, iv, authTag) {
        const key = this._getKey();

        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(iv, 'base64')
        );

        // set Auth tag. final() throw if there is a mismatch
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));

        try {
            const decrypted = Buffer.concat([
                decipher.update(Buffer.from(encryptedData, 'base64')),
                decipher.final()  
            ]);
            return decrypted;
        } catch (err) {
            throw new Error('Decryption failed: data may have been tampered');
        }
    }

    // SHA-256 hash for artifact and log verify 
    //generate hashes to stroe blockchain
    hashData(data) {
        const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
        return crypto
            .createHash('sha256')
            .update(inputBuffer)
            .digest('hex');
    }

    //  key validate and return
    _getKey() {
        const keyHex = process.env.ENCRYPTION_KEY;

        if (!keyHex) {
            throw new Error('ENCRYPTION_KEY not set in .env');
        }
        if (keyHex.length !== 64) {
            throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
        }

        return Buffer.from(keyHex, 'hex');
    }
}

module.exports = new EncryptionService();