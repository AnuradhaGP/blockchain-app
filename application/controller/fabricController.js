const fabricService = require('../services/fabricService');
// This endpoint receives build data from Jenkins and commits it to the Blockchain.
exports.recordBuild = async (req, res) => {
    try {
        const { buildId, artifactHash, logIpfsHash, buildBy } = req.body;
        await fabricService.recordBuild(buildId, artifactHash, logIpfsHash, buildBy);
        res.status(200).json({ status: 'Success', message: `Build ${buildId} Recorded` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// This endpoint checks if the artifact deployed matches the immutable record in Blockchain.
exports.verifyArtifact = async (req, res) => {
    const { buildId, currentHash } = req.body;
    const io = req.app.get('socketio'); // get socketio instance from app.js

    try {
        const result = await fabricService.verifyArtifact(buildId, currentHash);
        io.emit('verification_success', { buildId, message: result });
        res.status(200).json({ status: 'Verified', message: result });
    } catch (error) {
        if (error.message.includes('TAMPER DETECTED')) {
            io.emit('tamper_alert', {
                buildId,
                error: error.message,
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
        res.statu(500).json({ error: error.message })
    }
}