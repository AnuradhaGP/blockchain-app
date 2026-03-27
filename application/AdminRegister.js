// import { buildCAClient, registerAndEnrollUser, enrollAdmin } from'./utils/CAUtil.js';
// import { buildCCPOrg1, buildWallet } from'./utils/AppUtil.js';
// import FabricCAServices from'fabric-ca-client';


// async function main(){

//     const mspOrg1 = 'Org1MSP';
//     const walletPath = path.join(__dirname, 'wallet');
//     const userId = 'appUser';
 

//  // Initial Setup Helper (Optional: enroll admin and user if not exists)
//     // You should run separate scripts for enrollment usually, but for prototype:
//     try {
//         const ccp = buildCCPOrg1();
//         const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
//         const wallet = await buildWallet(Wallets, walletPath);
//         await enrollAdmin(caClient, wallet, mspOrg1);
//         await registerAndEnrollUser(caClient, wallet, mspOrg1, userId, 'org1.department1');
//         console.log("User enrolled successfully");
//     } catch (e) {
//         console.log("Enrollment check skipped or failed (User might already exist):", e.message);
//     }
// }
// main();
import { buildCAClient, registerAndEnrollUser, enrollAdmin } from './utils/CAUtil.js';
import { buildCCPOrg1, buildWallet } from './utils/AppUtil.js';
import FabricCAServices from 'fabric-ca-client';
import { Wallets } from 'fabric-network'; // මේක අනිවාර්යයි
import path from 'path';
import { fileURLToPath } from 'url';

// ES Modules වල __dirname ලබාගන්නා විදිහ
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const mspOrg1 = 'Org1MSP';
    const walletPath = path.join(__dirname, 'wallet');
    const userId = 'appUser';

    try {
        console.log("Setting up Fabric CA Client..."); // Log එකක් දාමු වැඩේ වෙනවද බලන්න
        const ccp = buildCCPOrg1();
        const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
        
        console.log("Building wallet...");
        const wallet = await buildWallet(Wallets, walletPath);
        
        console.log("Enrolling Admin...");
        await enrollAdmin(caClient, wallet, mspOrg1);
        
        console.log("Registering and Enrolling User...");
        await registerAndEnrollUser(caClient, wallet, mspOrg1, userId, 'org1.department1');
        
        console.log("User enrolled successfully!");
    } catch (e) {
        console.error("Error occurred:", e); // error එක විස්තරාත්මකව බලමු
    }
}

main();