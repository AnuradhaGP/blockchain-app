const express = require('express');
const router = express.Router();
const fabricController = require('../controllers/fabricController');

router.post('/record', fabricController.recordBuild);
router.post('/verify', fabricController.verifyArtifact);
router.get('/history/:buildId', fabricController.getBuildHistory);
router.get('/all', fabricController.getAllBuilds);
router.post('/log/upload', fabricController.uploadLog);

module.exports = router;