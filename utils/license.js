// utils/license.js — License Key System for Barcode MES v2
// Key format: BMES-YYYYMMDD-MACPART-SIGNATURE
// Only needs: Machine ID + Days to generate a key

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const os     = require('os');

const VENDOR_SECRET = 'BarcodeMES@Vendor#2024!SecretKey$XYZ';
const PRODUCT_CODE  = 'BMES';
const LICENSE_FILE  = path.join(process.env.APPDATA || os.homedir(), '.barcodemeslicense');

// ── Get this machine's ID ─────────────────────────────────────
function getMachineId() {
    const info = [
        os.hostname(),
        os.platform(),
        os.arch(),
        Object.values(os.networkInterfaces())
            .flat()
            .filter(n => !n.internal && n.mac !== '00:00:00:00:00:00')
            .map(n => n.mac)
            .sort()[0] || 'no-mac'
    ].join('|');
    return crypto.createHash('md5').update(info).digest('hex').toUpperCase().slice(0, 12);
}

// ── HMAC sign ─────────────────────────────────────────────────
function sign(payload) {
    return crypto.createHmac('sha256', VENDOR_SECRET)
        .update(payload)
        .digest('hex')
        .toUpperCase()
        .slice(0, 8);
}

// ── Generate key for a machine ID ────────────────────────────
// Format: BMES-YYYYMMDD-MID6-SIGNATURE
// machineId: 12-char ID customer shares with you
// days: license duration
function generateKey(machineId, days) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + parseInt(days));
    const expiryStr = expiry.toISOString().slice(0,10).replace(/-/g,'');

    // Use first 4 chars of machine ID as identifier part
    const midPart = machineId.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);

    // Signature includes full machineId so key only works on THAT machine
    const payload = `${PRODUCT_CODE}|${expiryStr}|${midPart}|${machineId.toUpperCase()}`;
    const sig = sign(payload);

    return `${PRODUCT_CODE}-${expiryStr}-${midPart}-${sig}`;
}

// ── Validate key (checks machine ID match) ────────────────────
function validateKey(rawKey, machineId) {
    try {
        const key   = rawKey.trim().toUpperCase().replace(/\s/g,'');
        const parts = key.split('-');
        if (parts.length !== 4) return { valid: false, reason: 'Invalid key format' };

        const [prod, expiryStr, midPart, sig] = parts;
        if (prod !== PRODUCT_CODE) return { valid: false, reason: 'Wrong product — this key is not for Barcode MES' };
        if (expiryStr.length !== 8) return { valid: false, reason: 'Invalid key format' };

        const mid = (machineId || getMachineId()).toUpperCase();

        // Verify signature with this machine's ID
        const payload = `${prod}|${expiryStr}|${midPart}|${mid}`;
        const expectedSig = sign(payload);
        if (sig !== expectedSig) {
            return { valid: false, reason: 'Key is not valid for this computer. Please contact your vendor.' };
        }

        // Check expiry
        const year  = parseInt(expiryStr.slice(0,4));
        const month = parseInt(expiryStr.slice(4,6)) - 1;
        const day   = parseInt(expiryStr.slice(6,8));
        const expiryDate = new Date(year, month, day, 23, 59, 59);

        if (isNaN(expiryDate.getTime())) return { valid: false, reason: 'Corrupt expiry date in key' };

        const now = new Date();
        if (now > expiryDate) {
            return { valid: false, expired: true, expiryDate,
                     reason: `License expired on ${expiryDate.toLocaleDateString('en-IN')}` };
        }

        const daysLeft = Math.ceil((expiryDate - now) / 86400000);
        return { valid: true, expiryDate, daysLeft };

    } catch(e) {
        return { valid: false, reason: 'Key validation error: ' + e.message };
    }
}

// ── Save license to disk ──────────────────────────────────────
function saveLicense(key, registeredName, registeredCompany) {
    const machineId = getMachineId();
    const validation = validateKey(key, machineId);
    if (!validation.valid) return { ok: false, reason: validation.reason };

    const data = {
        key, registeredName, registeredCompany, machineId,
        registeredAt: new Date().toISOString(),
        expiryDate:   validation.expiryDate.toISOString()
    };
    const encoded  = Buffer.from(JSON.stringify(data)).toString('base64');
    const checksum = sign(encoded);
    fs.writeFileSync(LICENSE_FILE, JSON.stringify({ d: encoded, c: checksum }), 'utf8');
    return { ok: true };
}

// ── Load & verify saved license ───────────────────────────────
function loadLicense() {
    try {
        if (!fs.existsSync(LICENSE_FILE)) return { status: 'unregistered' };
        const raw = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));
        if (sign(raw.d) !== raw.c) return { status: 'tampered' };

        const data = JSON.parse(Buffer.from(raw.d, 'base64').toString('utf8'));

        // Re-validate key against THIS machine's current ID
        const currentMachineId = getMachineId();
        const validation = validateKey(data.key, currentMachineId);

        if (!validation.valid) {
            return {
                status: validation.expired ? 'expired' : 'invalid',
                expiryDate: validation.expiryDate,
                registeredName: data.registeredName,
                registeredCompany: data.registeredCompany,
                reason: validation.reason
            };
        }
        return {
            status: 'active',
            registeredName:    data.registeredName,
            registeredCompany: data.registeredCompany,
            machineId:         data.machineId,
            registeredAt:      data.registeredAt,
            expiryDate:        new Date(data.expiryDate),
            daysLeft:          validation.daysLeft
        };
    } catch(e) {
        return { status: 'invalid' };
    }
}

module.exports = { generateKey, validateKey, saveLicense, loadLicense, getMachineId };
