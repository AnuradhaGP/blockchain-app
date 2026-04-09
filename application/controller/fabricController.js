const fabricService = require('../services/fabricService');
const pinataService    = require('../services/pinataService');
// This endpoint receives build data from Jenkins and commits it to the Blockchain.
exports.recordBuild = async (req, res) => {
    try {
        const { buildId, artifactHash, logHash,logCid,buildBy } = req.body;
      

         // Basic validation
        if (!buildId || !artifactHash || !logHash) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await fabricService.recordBuild(buildId, artifactHash, logHash,logCid,buildBy);
        res.status(200).json({ status: 'Success', message: `Build ${buildId} Recorded` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// This endpoint checks if the artifact deployed matches the immutable record in Blockchain.
exports.verifyArtifact = async (req, res) => {
    const { buildId, currentArtifactHash, currentLogHash } = req.body;
    const io = req.app.get('socketio'); // get socketio instance from app.js

   try {
        if (!buildId || !currentArtifactHash || !currentLogHash) {
            return res.status(400).json({ 
                error: 'buildId, currentArtifactHash and currentLogHash required' 
            });
        }

        const result = await fabricService.verifyArtifact(
            buildId,
            currentArtifactHash,
            currentLogHash
        );
        const parsed = JSON.parse(result);

        io.emit('verification_success', { buildId, message: parsed.message });
        res.status(200).json({ status: 'VERIFIED', ...parsed });

    } catch (error) {
        if (error.message.includes('TAMPER DETECTED')) {
            io.emit('tamper_alert', {
                buildId,
                error   : error.message,
                severity: 'CRITICAL'
            });
        }
        res.status(400).json({ status: 'Failed', error: error.message });
    }
};
//Get History (For Auditor)
exports.getBuildHistory = async (req, res) => {
    try {
        const history = await fabricService.getHistory(req.params.buildId);
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
//  Get All Builds (For Dashboard)
exports.getAllBuilds = async (req,res)=> {
    try{
        const result= await fabricService.getAllBuilds();
        res.status(200).json(result)
    } catch(error) {
        res.status(500).json({ error: error.message })
    }
}

exports.uploadLog = async (req, res) => {
    try {
        const { logContent, buildId } = req.body;

        if (!logContent || !buildId) {
            return res.status(400).json({ error: 'logContent and buildId required' });
        }

        const { logCid, logHash } = await pinataService.uploadLog(logContent, buildId);

        res.status(200).json({ status: 'Success', logCid, logHash });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};