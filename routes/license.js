// routes/license.js — Registration & License Check Routes
const express = require('express');
const router  = express.Router();
const { validateKey, saveLicense, loadLicense, getMachineId } = require('../utils/license');

// ── Show Registration Page ────────────────────────────────────
router.get('/register', (req, res) => {
    const license = loadLicense();
    const machineId = getMachineId();
    res.render('license/register', {
        title: 'Product Registration',
        license, machineId,
        error: req.query.error || null,
        success: req.query.success || null
    });
});

// ── Submit Registration ───────────────────────────────────────
router.post('/register', (req, res) => {
    const { license_key, registered_name, registered_company } = req.body;

    if (!license_key || !registered_name || !registered_company) {
        return res.redirect('/register?error=All+fields+are+required');
    }

    const validation = validateKey(license_key);

    if (!validation.valid) {
        const msg = encodeURIComponent(validation.reason || 'Invalid license key');
        return res.redirect(`/register?error=${msg}`);
    }

    const saved = saveLicense(license_key.trim().toUpperCase(), registered_name.trim(), registered_company.trim());

    if (!saved.ok) {
        const msg = encodeURIComponent(saved.reason || 'Failed to save license. Contact support.');
        return res.redirect('/register?error=' + msg);
    }

    res.redirect('/register?success=1');
});

// ── License Status API (for admin check) ─────────────────────
router.get('/license-status', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'Owner') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const license = loadLicense();
    res.json(license);
});

module.exports = router;
