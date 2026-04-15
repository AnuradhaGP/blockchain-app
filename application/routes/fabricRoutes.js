const express = require('express');
const router = express.Router();
const fabricController = require('../controller/fabricController');
const {verifyApiKey} = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/record',verifyApiKey, fabricController.recordBuild);
router.post('/verify', fabricController.verifyArtifact);
router.get('/history/:buildId', fabricController.getBuildHistory);
router.get('/all', fabricController.getAllBuilds);
router.post('/log/upload', verifyApiKey, upload.single('logFile'), fabricController.uploadLog);
router.get('/log/:cid', fabricController.getLog);

module.exports = router;