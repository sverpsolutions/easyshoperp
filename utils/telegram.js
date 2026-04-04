// utils/telegram.js
// Uses built-in fetch (Node 18+) with fallback to node-fetch, then to https module
// Works WITHOUT npm install

// ── Fetch function — works on any Node version ─────────────
async function doFetch(url, options) {
    // 1. Try built-in fetch (Node 18+)
    if (typeof fetch !== 'undefined') {
        return fetch(url, options);
    }
    // 2. Try node-fetch if installed
    try {
        const nf = require('node-fetch');
        return nf(url, options);
    } catch(e) {}
    // 3. Fallback: use native https module (always available)
    return new Promise((resolve, reject) => {
        const https = require('https');
        const body  = options.body || '';
        const u     = new URL(url);
        const reqOptions = {
            hostname: u.hostname,
            path:     u.pathname + u.search,
            method:   options.method || 'GET',
            headers:  { ...options.headers, 'Content-Length': Buffer.byteLength(body) }
        };
        const req = https.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, json: () => Promise.resolve(JSON.parse(data)) });
            });
        });
        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

// ── Settings cache ─────────────────────────────────────────
let _cache = null;
let _cacheTime = 0;

async function getSettings() {
    if (_cache && (Date.now() - _cacheTime) < 60000) return _cache;
    try {
        const { query } = require('../config/database');
        const r = await query(`SELECT setting_key, setting_value FROM Settings`);
        _cache = {};
        r.recordset.forEach(s => { _cache[s.setting_key] = s.setting_value; });
        _cacheTime = Date.now();
        return _cache;
    } catch(e) { return {}; }
}

function clearCache() { _cache = null; }

// ── Core send ──────────────────────────────────────────────
async function send(chatId, text) {
    const s     = await getSettings();
    const token = (s.telegram_bot_token || '').trim();
    if (!token || !chatId) return false;
    try {
        const res = await doFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ chat_id: String(chatId).trim(), text, parse_mode: 'HTML' })
        });
        const d = await res.json();
        return d.ok;
    } catch(e) { console.error('Telegram send error:', e.message); return false; }
}

// ── Test send (uses provided token/chat_id directly) ───────
async function sendTest(botToken, chatId, text) {
    try {
        const res = await doFetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ chat_id: String(chatId).trim(), text, parse_mode: 'HTML' })
        });
        return res.json();
    } catch(e) { return { ok: false, description: e.message }; }
}

async function notifyOwner(text) {
    const s = await getSettings();
    if (s.telegram_enabled !== '1' || !s.telegram_owner_chat_id) return;
    return send(s.telegram_owner_chat_id, text);
}

async function notifyCustomer(chatId, text) {
    const s = await getSettings();
    if (s.telegram_enabled !== '1' || !chatId) return;
    return send(chatId, text);
}

async function onJobStarted({ job, operatorName, machineName }) {
    const s = await getSettings();
    if (s.telegram_enabled !== '1' || s.notify_on_job_start !== '1') return;
    await notifyOwner(`▶️ <b>JOB STARTED</b>\n\n📋 <b>Job:</b> <code>${job.Job_Number}</code>\n🏢 <b>Customer:</b> ${job.Customer_Name}\n📦 <b>Qty:</b> ${Number(job.Required_Qty||0).toLocaleString()}\n👤 <b>Operator:</b> ${operatorName}\n⚙️ <b>Machine:</b> ${machineName}\n🕐 ${new Date().toLocaleString('en-IN')}`);
    if (job.Telegram_Notify && job.Customer_Chat_ID) {
        await notifyCustomer(job.Customer_Chat_ID, `✅ <b>Your Order Started!</b>\n\nOrder <code>${job.Job_Number}</code> is now in production.\nQty: ${Number(job.Required_Qty||0).toLocaleString()} pcs\nWe'll notify you when complete! 🙏`);
    }
}

async function onProductionLogged({ job, operatorName, qty, newTotal }) {
    const s = await getSettings();
    if (s.telegram_enabled !== '1') return;
    const reqQty  = job.Required_Qty || 0;
    const pct     = reqQty > 0 ? Math.round(newTotal * 100 / reqQty) : 0;
    const prevPct = reqQty > 0 ? Math.round((newTotal - qty) * 100 / reqQty) : 0;
    const notifyAll = s.notify_on_log === '1';
    const milestone = s.notify_milestones === '1' && [25,50,75].some(m => prevPct < m && pct >= m);
    if (!notifyAll && !milestone) return;
    const bar = '█'.repeat(Math.round(pct/10)) + '░'.repeat(10-Math.round(pct/10));
    await notifyOwner(`📊 <b>PRODUCTION UPDATE</b>\n\n📋 <b>Job:</b> <code>${job.Job_Number}</code>\n➕ <b>This Entry:</b> ${Number(qty).toLocaleString()} pcs\n📦 <b>Total:</b> ${Number(newTotal).toLocaleString()} / ${Number(reqQty).toLocaleString()}\n${bar} <b>${pct}%</b>\n👤 ${operatorName}`);
}

async function onJobCompleted({ job, operatorName, machineName, finalQty }) {
    const s = await getSettings();
    if (s.telegram_enabled !== '1' || s.notify_on_job_complete !== '1') return;
    const total = (job.Produced_Qty || 0) + (finalQty || 0);
    const pct   = job.Required_Qty > 0 ? Math.round(total * 100 / job.Required_Qty) : 0;
    await notifyOwner(`✅ <b>JOB COMPLETED</b>\n\n📋 <b>Job:</b> <code>${job.Job_Number}</code>\n🏢 <b>Customer:</b> ${job.Customer_Name}\n📦 <b>Produced:</b> ${Number(total).toLocaleString()} (${pct}%)\n👤 ${operatorName} | ⚙️ ${machineName}\n🕐 ${new Date().toLocaleString('en-IN')}`);
    if (job.Telegram_Notify && job.Customer_Chat_ID) {
        await notifyCustomer(job.Customer_Chat_ID, `🎉 <b>Your Order is Ready!</b>\n\nOrder <code>${job.Job_Number}</code> completed!\nQty: ${Number(total).toLocaleString()} pcs ✅\nPlease contact us for dispatch. 🙏`);
    }
}

async function onStatusChanged({ job, newStatus, changedBy }) {
    const s = await getSettings();
    if (s.telegram_enabled !== '1' || s.notify_status_change !== '1') return;
    const emoji = { Assigned:'📌', Running:'▶️', Paused:'⏸', Completed:'✅', Dispatched:'🚚', Cancelled:'❌' };
    await notifyOwner(`${emoji[newStatus]||'🔄'} <b>JOB STATUS: ${newStatus}</b>\n\n📋 <code>${job.Job_Number}</code> — ${job.Customer_Name}\n👤 By: ${changedBy}\n🕐 ${new Date().toLocaleString('en-IN')}`);
    if (job.Telegram_Notify && job.Customer_Chat_ID && ['Dispatched','Cancelled'].includes(newStatus)) {
        const m = newStatus === 'Dispatched'
            ? `🚚 <b>Dispatched!</b>\nOrder <code>${job.Job_Number}</code> is on its way! 🙏`
            : `❌ <b>Order Update</b>\nOrder <code>${job.Job_Number}</code> was cancelled. Please call us.`;
        await notifyCustomer(job.Customer_Chat_ID, m);
    }
}

module.exports = { send, sendTest, notifyOwner, notifyCustomer, onJobStarted, onProductionLogged, onJobCompleted, onStatusChanged, clearCache };
