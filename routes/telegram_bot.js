// routes/telegram_bot.js  — Customer order-status chatbot webhook
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { send } = require('../utils/telegram');

// POST /api/telegram/webhook  (set this URL in BotFather)
router.post('/webhook', async (req, res) => {
    res.sendStatus(200); // Always respond fast

    try {
        const body = req.body;
        if (!body.message) return;

        const chatId = body.message.chat.id;
        const text   = (body.message.text || '').trim().toUpperCase();
        const firstName = body.message.from.first_name || 'Customer';

        // Commands
        if (text === '/START' || text === 'START') {
            await send(chatId,
`👋 <b>Welcome to Barcode MES Order Tracker!</b>

Hello ${firstName}! I can help you check your order status.

📋 <b>How to check your order:</b>
Just send your <b>Order Number</b> (e.g. <code>J-2025-0001</code>)

I will show you the current status, qty produced, and delivery date.

Type your order number to get started! 👇`
            );
            return;
        }

        if (text === '/HELP' || text === 'HELP') {
            await send(chatId,
`ℹ️ <b>Help</b>

• Send your <b>Order Number</b> to check status
• Example: <code>J-2025-0001</code>

For any queries, please call us directly.`
            );
            return;
        }

        // Try to find job by number (strip spaces, hyphens flexible)
        const jobNumber = text.replace(/\s+/g,'-');

        const r = await query(`
            SELECT j.Job_Number, j.Customer_Name, j.Order_Date, j.Delivery_Date,
                   j.Size, j.Label, j.Label_Type, j.Required_Qty, j.Produced_Qty,
                   j.Status, j.Start_Time, j.End_Time,
                   ISNULL(e.Name,'—') AS Operator_Name
            FROM Jobs j
            LEFT JOIN Employees e ON e.Employee_ID=j.Assigned_Operator_ID
            WHERE UPPER(j.Job_Number) = @jn OR UPPER(j.Job_Number) = @jn2
        `, { jn: jobNumber, jn2: text });

        if (!r.recordset[0]) {
            await send(chatId,
`❌ <b>Order not found</b>

Order number <code>${text}</code> was not found in our system.

Please check the order number and try again, or contact us directly.`
            );
            return;
        }

        const j = r.recordset[0];
        const pct  = j.Required_Qty>0 ? Math.round(j.Produced_Qty*100/j.Required_Qty) : 0;
        const bar  = '█'.repeat(Math.round(pct/10)) + '░'.repeat(10-Math.round(pct/10));

        const statusEmoji = {
            Pending:'🕐', Assigned:'📌', Running:'▶️', Paused:'⏸',
            Completed:'✅', Dispatched:'🚚', Cancelled:'❌'
        };

        const msg =
`📋 <b>ORDER STATUS</b>

<b>Order No:</b> <code>${j.Job_Number}</code>
<b>Customer:</b> ${j.Customer_Name}

📐 <b>Size:</b> ${j.Size||'—'}
🗂 <b>Label:</b> ${j.Label||j.Label_Type||'—'}
📦 <b>Qty Required:</b> ${Number(j.Required_Qty).toLocaleString()}
✅ <b>Qty Produced:</b> ${Number(j.Produced_Qty).toLocaleString()}

${bar} ${pct}%

${statusEmoji[j.Status]||'🔄'} <b>Status:</b> <b>${j.Status}</b>

📅 <b>Order Date:</b> ${j.Order_Date ? new Date(j.Order_Date).toLocaleDateString('en-IN') : '—'}
🚚 <b>Delivery Date:</b> ${j.Delivery_Date ? new Date(j.Delivery_Date).toLocaleDateString('en-IN') : 'Not set'}
${j.Start_Time ? `▶️ <b>Started:</b> ${new Date(j.Start_Time).toLocaleString('en-IN')}` : ''}
${j.End_Time ? `✅ <b>Completed:</b> ${new Date(j.End_Time).toLocaleString('en-IN')}` : ''}

_Send order number anytime to refresh status_`;

        await send(chatId, msg);

    } catch(err) {
        console.error('Telegram webhook error:', err.message);
    }
});

// GET /api/telegram/set-webhook  — helper to register webhook URL
router.get('/set-webhook', async (req, res) => {
    const { query: dbQuery } = require('../config/database');
    try {
        const s = await dbQuery(`SELECT setting_value FROM Settings WHERE setting_key='telegram_bot_token'`);
        const token = s.recordset[0]?.setting_value;
        if (!token) return res.json({ ok:false, error:'No bot token configured' });

        const webhookUrl = `${req.protocol}://${req.get('host')}/api/telegram/webhook`;
        const fetch = require('node-fetch');
        const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ url: webhookUrl, allowed_updates:['message'] })
        });
        const d = await r.json();
        res.json({ ok:d.ok, description:d.description, webhook_url:webhookUrl });
    } catch(e) {
        res.json({ ok:false, error:e.message });
    }
});

module.exports = router;
