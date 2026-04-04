// routes/settings.js
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { isLoggedIn, isOwner } = require('../middleware/auth');
const { clearCache, send } = require('../utils/telegram');

router.use(isLoggedIn, isOwner);

// GET /owner/settings
router.get('/', async (req, res) => {
    try {
        const r = await query(`SELECT setting_key, setting_value, setting_label, setting_group FROM Settings ORDER BY setting_group, setting_key`);
        const settings = {};
        r.recordset.forEach(s => { settings[s.setting_key] = s; });
        res.render('owner/settings', { title: 'Settings', settings, rows: r.recordset });
    } catch(err) {
        res.render('error', { title:'Error', message: err.message });
    }
});

// POST /owner/settings  — save all settings
router.post('/', async (req, res) => {
    try {
        const allowed = [
            'telegram_enabled','telegram_bot_token','telegram_owner_chat_id',
            'notify_on_job_start','notify_on_job_complete','notify_on_log',
            'notify_milestones','notify_status_change','factory_name','factory_mobile'
        ];

        for (const key of allowed) {
            // Checkboxes: unchecked sends nothing → '0', checked → '1'
            const val = req.body[key] !== undefined ? req.body[key] : '0';
            await query(
                `IF EXISTS (SELECT 1 FROM Settings WHERE setting_key=@k)
                     UPDATE Settings SET setting_value=@v WHERE setting_key=@k
                 ELSE
                     INSERT INTO Settings(setting_key,setting_value) VALUES(@k,@v)`,
                { k: key, v: val }
            );
        }

        clearCache();
        req.flash('success', '✅ Settings saved successfully');
    } catch(err) {
        console.error(err);
        req.flash('error', 'Error saving settings: ' + err.message);
    }
    res.redirect('/owner/settings');
});

// POST /owner/settings/test-telegram — send a test message
router.post('/test-telegram', async (req, res) => {
    try {
        const { bot_token, chat_id } = req.body;
        if (!bot_token || !chat_id) {
            return res.json({ ok: false, error: 'Bot token and Chat ID are required' });
        }

        const fetch = require('node-fetch');
        const r = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chat_id.trim(),
                text: `✅ <b>MES System Test Message</b>\n\nYour Barcode MES Telegram integration is working correctly!\n\n🕐 ${new Date().toLocaleString('en-IN')}`,
                parse_mode: 'HTML'
            }),
            timeout: 8000
        });
        const d = await r.json();
        if (d.ok) {
            res.json({ ok: true, message: 'Test message sent successfully!' });
        } else {
            res.json({ ok: false, error: d.description || 'Telegram API error' });
        }
    } catch(err) {
        res.json({ ok: false, error: err.message });
    }
});

module.exports = router;
