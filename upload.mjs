import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const STORAGE_ZONE = 'scriptarc-course';
const FTP_HOST = 'sg.storage.bunnycdn.com';
const FTP_USER = 'scriptarc-course';
const FTP_PASS = '7b6f1e91-ca6d-4dc3-8711e55d78a0-d54d-4707';

const BASE_DIR = path.resolve('C:/Users/Aswin/Documents/Code/Dev/ScriptArc/ScriptArc_V1/frontend/public/Course/Data Science');

async function uploadFileViaCurl(localPath, remotePath, retries = 3) {
    // FTP URL: ftp://host/storagezone/remote/path
    const ftpUrl = `ftp://${FTP_HOST}/${STORAGE_ZONE}/${remotePath}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await execFileAsync('curl', [
                '--ftp-ssl',
                '--insecure',        // skip cert check (Windows Schannel compat)
                '-u', `${FTP_USER}:${FTP_PASS}`,
                '-T', localPath,
                '--ftp-create-dirs',
                '--silent',
                '--show-error',
                ftpUrl
            ]);
            return; // success
        } catch (e) {
            if (attempt === retries) throw e;
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
}

async function uploadDirectory(unitName) {
    const unitDir = path.join(BASE_DIR, unitName);
    const unitEntries = await fs.readdir(unitDir, { withFileTypes: true });

    const uploadQueue = [];

    for (const entry of unitEntries) {
        if (entry.isDirectory() && entry.name.startsWith('lecture')) {
            const lectureDir = path.join(unitDir, entry.name);
            const files = await fs.readdir(lectureDir);
            for (const file of files) {
                if (file.endsWith('.m3u8') || file.endsWith('.ts')) {
                    const filePath = path.join(lectureDir, file);
                    // Remote path under storage zone root
                    const remotePath = `Course/Data Science/${unitName}/${entry.name}/${file}`;
                    uploadQueue.push({ filePath, remotePath });
                }
            }
        }
    }

    console.log(`Queueing ${uploadQueue.length} files for ${unitName}`);

    let uploadedCount = 0;
    let errorCount = 0;
    const concurrency = 5; // FTP handles fewer parallel connections than HTTP

    while (uploadQueue.length > 0) {
        const batch = uploadQueue.splice(0, concurrency);
        await Promise.all(batch.map(async item => {
            try {
                await uploadFileViaCurl(item.filePath, item.remotePath);
                uploadedCount++;
            } catch (err) {
                errorCount++;
                console.error(`  FAIL: ${item.remotePath} — ${err.stderr || err.message}`);
            }
        }));
        const done = uploadedCount + errorCount;
        if (done % 50 === 0 || uploadQueue.length === 0) {
            console.log(`  Progress ${unitName}: ${uploadedCount} ok, ${errorCount} errors (${uploadQueue.length} remaining)`);
        }
    }
}

async function main() {
    console.log('Starting upload via FTP...');
    console.log('Unit 1:');
    await uploadDirectory('Unit1');
    console.log('Unit 2:');
    await uploadDirectory('Unit2');
    console.log(`\nDone!`);
}

main().catch(console.error);
