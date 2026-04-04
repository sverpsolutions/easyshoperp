// routes/owner.js — All Owner Routes (dashboard, jobs, reports, settings)
const express = require('express');
const router  = express.Router();
const { query, execute } = require('../config/database');
const { isLoggedIn, isOwner } = require('../middleware/auth');
const tg = require('../utils/telegram');

router.use(isLoggedIn, isOwner);

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
    try {
        const [machines, summary, todayProd, pendingJobs, operatorsOnline, pendingAdvances] = await Promise.all([
            query(`
                SELECT m.Machine_ID, m.Machine_Name, m.Machine_Type, m.Status,
                       ISNULL(e.Name,'—') AS Operator_Name,
                       ISNULL(j.Job_Number,'') AS Job_Number,
                       ISNULL(j.Customer_Name,'') AS Customer_Name,
                       ISNULL(j.Required_Qty,0) AS Required_Qty,
                       ISNULL(j.Produced_Qty,0) AS Produced_Qty,
                       j.Start_Time,
                       ISNULL(DATEDIFF(MINUTE,j.Start_Time,GETDATE()),0) AS Run_Minutes,
                       CASE WHEN ISNULL(j.Required_Qty,0)>0
                            THEN CAST(ISNULL(j.Produced_Qty,0)*100.0/j.Required_Qty AS DECIMAL(5,1))
                            ELSE 0 END AS Job_Progress
                FROM Machines m
                LEFT JOIN Employees e ON e.Employee_ID=m.Current_Operator_ID
                LEFT JOIN Jobs j      ON j.Job_ID=m.Current_Job_ID
                ORDER BY m.Machine_ID
            `),
            query(`
                SELECT COUNT(*) AS Total,
                  SUM(CASE WHEN Status='Running'     THEN 1 ELSE 0 END) AS Running,
                  SUM(CASE WHEN Status='Idle'        THEN 1 ELSE 0 END) AS Idle,
                  SUM(CASE WHEN Status='Stopped'     THEN 1 ELSE 0 END) AS Stopped,
                  SUM(CASE WHEN Status='Maintenance' THEN 1 ELSE 0 END) AS Maintenance,
                  CAST(SUM(CASE WHEN Status='Running' THEN 1.0 ELSE 0 END)/COUNT(*)*100 AS DECIMAL(5,1)) AS Utilization
                FROM Machines
            `),
            query(`SELECT ISNULL(SUM(Qty_Produced),0) AS Total FROM Job_Production_Log WHERE CAST(Entry_Time AS DATE)=CAST(GETDATE() AS DATE)`),
            query(`SELECT COUNT(*) AS Count FROM Jobs WHERE Status IN ('Pending','Assigned')`),
            query(`SELECT COUNT(DISTINCT Current_Operator_ID) AS Count FROM Machines WHERE Current_Operator_ID IS NOT NULL`),
            query(`
                SELECT a.Advance_ID, e.Name AS Employee_Name, e.Mobile,
                       a.Amount_Requested, a.Reason, a.Request_Date, a.Status
                FROM Employee_Advances a
                JOIN Employees e ON e.Employee_ID=a.Employee_ID
                WHERE a.Status='Pending'
                ORDER BY a.Request_Date ASC
            `),
        ]);

        // Job requests (table may not exist yet — safe fallback)
        let pendingJobRequests = [];
        try {
            const jrR = await query(`
                SELECT r.Request_ID, e.Name AS Employee_Name, e.Mobile,
                       m.Machine_Name, r.Description, r.Request_Date
                FROM Job_Requests r
                JOIN Employees e ON e.Employee_ID=r.Employee_ID
                LEFT JOIN Machines m ON m.Machine_ID=r.Machine_ID
                WHERE r.Status='Pending'
                ORDER BY r.Request_Date ASC
            `);
            pendingJobRequests = jrR.recordset;
        } catch(e) { /* table not yet created — ignore */ }

        res.render('owner/dashboard', {
            title: 'Owner Dashboard',
            machines:        machines.recordset,
            summary:         summary.recordset[0],
            todayProd:       todayProd.recordset[0].Total,
            pendingJobs:     pendingJobs.recordset[0].Count,
            operatorsOnline: operatorsOnline.recordset[0].Count,
            chartData:       JSON.stringify(machines.recordset.map(m=>({ name:m.Machine_Name, status:m.Status, type:m.Machine_Type }))),
            pendingAdvances:    pendingAdvances.recordset,
            pendingJobRequests: pendingJobRequests
        });
    } catch(err) {
        console.error('Dashboard error:', err);
        res.render('error', { title:'Error', message:err.message });
    }
});

// ─── Machine Detail (AJAX) ──────────────────────────────────
router.get('/machine/:id', async (req, res) => {
    try {
        const r = await query(`
            SELECT m.Machine_ID, m.Machine_Name, m.Machine_Type, m.Status,
                   ISNULL(e.Name,'—') AS Operator_Name,
                   ISNULL(e.Mobile,'') AS Operator_Mobile,
                   j.Job_ID, ISNULL(j.Job_Number,'') AS Job_Number,
                   ISNULL(j.Customer_Name,'') AS Customer_Name,
                   ISNULL(j.Label_Type,'') AS Label_Type,
                   ISNULL(j.Size,'') AS Size, ISNULL(j.Label,'') AS Label,
                   ISNULL(j.UPS,1) AS UPS, ISNULL(j.Gap_Type,'') AS Gap_Type,
                   ISNULL(j.Paper,'') AS Paper, ISNULL(j.Core,'') AS Core,
                   ISNULL(j.Packing,'') AS Packing,
                   ISNULL(j.Required_Qty,0) AS Required_Qty,
                   ISNULL(j.Produced_Qty,0) AS Produced_Qty,
                   j.Start_Time,
                   ISNULL(DATEDIFF(MINUTE,j.Start_Time,GETDATE()),0) AS Run_Minutes,
                   CASE WHEN ISNULL(j.Required_Qty,0)>0
                        THEN CAST(ISNULL(j.Produced_Qty,0)*100.0/j.Required_Qty AS DECIMAL(5,1))
                        ELSE 0 END AS Job_Progress,
                   NULL AS Next_Job,
                   ISNULL((SELECT SUM(Total_Run_Minutes) FROM Machine_Log
                            WHERE Machine_ID=m.Machine_ID
                              AND CAST(Start_Time AS DATE)=CAST(GETDATE() AS DATE)),0) AS Run_Minutes_Today
            FROM Machines m
            LEFT JOIN Employees e ON e.Employee_ID=m.Current_Operator_ID
            LEFT JOIN Jobs j      ON j.Job_ID=m.Current_Job_ID
            WHERE m.Machine_ID=@id
        `, { id: req.params.id });
        if (!r.recordset[0]) return res.status(404).json({ error:'Machine not found' });
        const d = r.recordset[0];
        d.Machine_Efficiency = d.Run_Minutes_Today > 0
            ? parseFloat((d.Run_Minutes_Today*100.0/480).toFixed(1)) : 0;
        res.json(d);
    } catch(err) { res.status(500).json({ error:err.message }); }
});

// ═══════════════════════════════════════════════════════════
// JOBS
// ═══════════════════════════════════════════════════════════
router.get('/jobs', async (req, res) => {
    const filterStatus = (req.query.status || '').trim();
    try {
        const params = filterStatus ? { st: filterStatus } : {};
        const whereClause = filterStatus ? `WHERE j.Status = @st` : '';
        const [jobs, machines, operators] = await Promise.all([
            query(`
                SELECT j.Job_ID, j.Job_Number,
                       CONVERT(NVARCHAR,j.Order_Date,105) AS Order_Date,
                       CONVERT(NVARCHAR,ISNULL(j.Delivery_Date,j.Order_Date),105) AS Delivery_Date,
                       j.Customer_Name, ISNULL(j.Mobile_No,'') AS Mobile,
                       ISNULL(j.Size,'') AS Size, ISNULL(j.Label,'') AS Label,
                       ISNULL(j.UPS,1) AS UPS, ISNULL(j.Gap_Type,'') AS Gap_Type,
                       ISNULL(j.Paper,'') AS Paper, ISNULL(j.Core,'') AS Core,
                       ISNULL(j.Packing,'') AS Packing, j.Label_Type,
                       j.Required_Qty, ISNULL(j.Produced_Qty,0) AS Produced_Qty,
                       j.Status, ISNULL(j.Priority,5) AS Priority,
                       j.Assigned_Machine_ID, j.Assigned_Operator_ID,
                       ISNULL(m.Machine_Name,'—') AS Machine_Name,
                       ISNULL(e.Name,'—') AS Operator_Name
                FROM Jobs j
                LEFT JOIN Machines m  ON m.Machine_ID  = j.Assigned_Machine_ID
                LEFT JOIN Employees e ON e.Employee_ID = j.Assigned_Operator_ID
                ${whereClause}
                ORDER BY j.Job_ID DESC
            `, params),
            query(`SELECT Machine_ID, Machine_Name, Machine_Type, Status FROM Machines ORDER BY Machine_Name`),
            query(`SELECT Employee_ID, Name FROM Employees WHERE Role='Operator' AND Is_Active=1 ORDER BY Name`)
        ]);
        res.render('owner/jobs', {
            title:'Job Register', jobs:jobs.recordset,
            machines:machines.recordset, operators:operators.recordset,
            filterStatus
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

router.post('/jobs', async (req, res) => {
    const {
        customer_name, mobile, order_date, delivery_date,
        size, label, ups, gap_type, paper, core, packing,
        label_type, required_qty, priority, notes,
        tg_notify, customer_chat_id
    } = req.body;
    if (!customer_name || !required_qty) {
        req.flash('error', 'Party Name and Order Qty are required');
        return res.redirect('/owner/jobs');
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        // Auto-generate Job_Number: J-YYYY-NNNN (safe: use MAX Job_ID as unique base)
        let jobNumber;
        try {
            const yr = new Date().getFullYear();
            // Count jobs this year to get next sequence (safe, no CAST/SUBSTRING)
            const seqR = await query(`
                SELECT ISNULL(MAX(CAST(SUBSTRING(Job_Number, 8, 10) AS INT)), 0) AS MaxSeq
                FROM Jobs
                WHERE Job_Number LIKE @pat AND ISNUMERIC(SUBSTRING(Job_Number, 8, 10))=1
            `, { pat: `J-${yr}-%` });
            const nextSeq = (parseInt(seqR.recordset[0]?.MaxSeq) || 0) + 1;
            jobNumber = `J-${yr}-${String(nextSeq).padStart(4,'0')}`;
        } catch(seqErr) {
            // Fallback: use timestamp-based number (always unique)
            jobNumber = `J-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        }
        if (!jobNumber) throw new Error('Failed to generate Job Number');

        await query(`
            INSERT INTO Jobs (
                Job_Number,
                Customer_Name, Mobile_No, Order_Date, Delivery_Date,
                Size, Label, UPS, Gap_Type, Paper, Core, Packing,
                Label_Type, Required_Qty, Priority, Notes,
                Telegram_Notify, Customer_Chat_ID, Status
            ) VALUES (
                @jnum,
                @cn, @mob, @od, @dd,
                @sz, @lb, @ups, @gap, @pap, @cor, @pack,
                @lt, @qty, @pri, @notes,
                @tgn, @cgid, 'Pending'
            )
        `, {
            jnum: jobNumber,
            cn: customer_name.trim(),
            mob: (mobile||'').trim(),
            od: order_date || today,
            dd: delivery_date || null,
            sz: (size||'').trim(),
            lb: (label||'').trim(),
            ups: parseInt(ups)||1,
            gap: (gap_type||'').trim(),
            pap: (paper||'').trim(),
            cor: (core||'').trim(),
            pack: (packing||'').trim(),
            lt: label_type || 'Plain',
            qty: parseInt(required_qty),
            pri: parseInt(priority)||5,
            notes: (notes||'').trim(),
            tgn: tg_notify ? 1 : 0,
            cgid: (customer_chat_id||'').trim()
        });
        req.flash('success', '✅ Job created successfully');
    } catch(err) {
        console.error('Create job error:', err);
        req.flash('error', 'Error creating job: ' + err.message);
    }
    res.redirect('/owner/jobs');
});

router.post('/jobs/update-status', async (req, res) => {
    const { job_id, status } = req.body;
    if (!job_id || !status) { req.flash('error','Missing job_id or status'); return res.redirect('/owner/jobs'); }
    try {
        const jobR = await query(`SELECT Job_ID,Job_Number,Customer_Name,Label_Type,Required_Qty,Produced_Qty,ISNULL(Telegram_Notify,0) AS Telegram_Notify,ISNULL(Customer_Chat_ID,'') AS Customer_Chat_ID FROM Jobs WHERE Job_ID=@id`, { id:parseInt(job_id) });
        await query(`UPDATE Jobs SET Status=@st${status==='Completed'?',End_Time=GETDATE()':''} WHERE Job_ID=@id`, { st:status, id:parseInt(job_id) });
        req.flash('success', `Job status updated to ${status}`);
        if (jobR.recordset[0]) tg.onStatusChanged({ job:jobR.recordset[0], newStatus:status, changedBy:req.session.user.name }).catch(()=>{});
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/owner/jobs');
});

router.post('/jobs/update-assign', async (req, res) => {
    const { job_id, machine_id, operator_id } = req.body;
    if (!job_id) { req.flash('error','Missing job_id'); return res.redirect('/owner/jobs'); }
    try {
        const mid = machine_id  && machine_id  !== '' ? parseInt(machine_id)  : null;
        const oid = operator_id && operator_id !== '' ? parseInt(operator_id) : null;
        await query(`
            UPDATE Jobs SET
                Assigned_Machine_ID  = @mid,
                Assigned_Operator_ID = @oid,
                Status = CASE WHEN Status='Pending' AND (@mid IS NOT NULL OR @oid IS NOT NULL)
                              THEN 'Assigned' ELSE Status END
            WHERE Job_ID = @id
        `, { mid, oid, id:parseInt(job_id) });
        req.flash('success', 'Job assigned successfully');
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/owner/jobs');
});

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
router.get('/settings', async (req, res) => {
    try {
        const r = await query(`SELECT setting_key, setting_value, setting_label, setting_group FROM Settings ORDER BY setting_group, setting_key`);
        const settings = {};
        r.recordset.forEach(s => { settings[s.setting_key] = s; });
        res.render('owner/settings', { title:'Settings', settings, rows:r.recordset });
    } catch(err) {
        // Settings table may not exist yet - show empty settings
        res.render('owner/settings', { title:'Settings', settings:{}, rows:[] });
    }
});

router.post('/settings', async (req, res) => {
    try {
        const allowed = [
            'telegram_enabled','telegram_bot_token','telegram_owner_chat_id',
            'notify_on_job_start','notify_on_job_complete','notify_on_log',
            'notify_milestones','notify_status_change','factory_name','factory_mobile'
        ];
        for (const key of allowed) {
            const val = req.body[key] !== undefined ? req.body[key] : '0';
            await query(
                `IF EXISTS (SELECT 1 FROM Settings WHERE setting_key=@k)
                     UPDATE Settings SET setting_value=@v WHERE setting_key=@k
                 ELSE
                     INSERT INTO Settings(setting_key,setting_value) VALUES(@k,@v)`,
                { k:key, v:val }
            );
        }
        tg.clearCache();
        req.flash('success', '✅ Settings saved successfully');
    } catch(err) {
        req.flash('error', 'Error saving settings: ' + err.message);
    }
    res.redirect('/owner/settings');
});

router.post('/settings/test-telegram', async (req, res) => {
    try {
        const { bot_token, chat_id } = req.body;
        if (!bot_token || !chat_id) return res.json({ ok:false, error:'Bot token and Chat ID are required' });
        const text = `✅ <b>MES System — Test Message</b>\n\nYour Telegram integration is working!\n🏭 Factory: Barcode Label MES\n🕐 ${new Date().toLocaleString('en-IN')}`;
        const d = await tg.sendTest(bot_token.trim(), chat_id.trim(), text);
        res.json(d.ok ? { ok:true, message:'✅ Test message sent successfully!' } : { ok:false, error:d.description || 'Telegram API error' });
    } catch(err) { res.json({ ok:false, error:err.message }); }
});

// ═══════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════
router.get('/reports', (req, res) => res.render('owner/reports', { title:'Reports & Analytics' }));

// Daily Production
router.get('/reports/daily', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT CAST(jpl.Entry_Time AS DATE) AS Production_Date,
                   j.Job_Number, j.Customer_Name,
                   ISNULL(j.Size,'—') AS Size, ISNULL(j.Label,'—') AS Label,
                   ISNULL(j.Paper,'—') AS Paper, ISNULL(j.Gap_Type,'—') AS Gap_Type,
                   j.Label_Type, m.Machine_Name, e.Name AS Operator_Name,
                   SUM(jpl.Qty_Produced) AS Total_Qty
            FROM Job_Production_Log jpl
            JOIN Jobs j      ON j.Job_ID      = jpl.Job_ID
            JOIN Machines m  ON m.Machine_ID  = jpl.Machine_ID
            JOIN Employees e ON e.Employee_ID = jpl.Operator_ID
            WHERE CAST(jpl.Entry_Time AS DATE) BETWEEN @f AND @t
            GROUP BY CAST(jpl.Entry_Time AS DATE),j.Job_Number,j.Customer_Name,
                     j.Size,j.Label,j.Paper,j.Gap_Type,j.Label_Type,m.Machine_Name,e.Name
            ORDER BY Production_Date DESC, j.Job_Number
        `, { f:from, t:to });
        res.render('owner/report-daily', { title:'Daily Production Report', rows:r.recordset||[], from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Label Type Summary
router.get('/reports/label-type', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT j.Label_Type,
                   COUNT(DISTINCT j.Job_ID) AS Total_Jobs,
                   ISNULL(SUM(j.Required_Qty),0) AS Total_Required,
                   ISNULL(SUM(j.Produced_Qty),0) AS Total_Produced,
                   SUM(CASE WHEN j.Status='Completed' THEN 1 ELSE 0 END) AS Completed_Jobs,
                   ISNULL(SUM(CASE WHEN j.Status IN ('Pending','Assigned') THEN j.Required_Qty ELSE 0 END),0) AS Pending_Qty
            FROM Jobs j
            WHERE ISNULL(j.Order_Date,CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
            GROUP BY j.Label_Type ORDER BY Total_Required DESC
        `, { f:from, t:to });
        res.render('owner/report-label-type', { title:'Label Type Report', rows:r.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Label Name Breakdown
router.get('/reports/label-name', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT ISNULL(j.Label,'(Not Specified)') AS Label_Name,
                   ISNULL(j.Size,'—') AS Size, ISNULL(j.Paper,'—') AS Paper,
                   ISNULL(j.Gap_Type,'—') AS Gap_Type,
                   COUNT(DISTINCT j.Job_ID) AS Total_Jobs,
                   ISNULL(SUM(j.Required_Qty),0) AS Total_Required,
                   ISNULL(SUM(j.Produced_Qty),0) AS Total_Produced,
                   COUNT(DISTINCT j.Customer_Name) AS Unique_Customers
            FROM Jobs j
            WHERE ISNULL(j.Order_Date,CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
            GROUP BY j.Label, j.Size, j.Paper, j.Gap_Type
            ORDER BY Total_Required DESC
        `, { f:from, t:to });
        res.render('owner/report-label-name', { title:'Label Breakdown Report', rows:r.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Operator x Label Type
router.get('/reports/operator-label', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT e.Name AS Operator_Name, j.Label_Type,
                   ISNULL(j.Label,'—') AS Label_Name, ISNULL(j.Size,'—') AS Size,
                   COUNT(DISTINCT j.Job_ID) AS Jobs_Done,
                   ISNULL(SUM(jpl.Qty_Produced),0) AS Total_Produced,
                   SUM(CASE WHEN j.Status='Completed' THEN 1 ELSE 0 END) AS Completed
            FROM Job_Production_Log jpl
            JOIN Jobs j      ON j.Job_ID      = jpl.Job_ID
            JOIN Employees e ON e.Employee_ID = jpl.Operator_ID
            WHERE CAST(jpl.Entry_Time AS DATE) BETWEEN @f AND @t
            GROUP BY e.Name, j.Label_Type, j.Label, j.Size
            ORDER BY e.Name, Total_Produced DESC
        `, { f:from, t:to });
        res.render('owner/report-operator-label', { title:'Operator × Label Report', rows:r.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Customer History
router.get('/reports/customer', async (req, res) => {
    const customer = (req.query.customer || '').trim();
    try {
        const customers = await query(`SELECT DISTINCT Customer_Name FROM Jobs ORDER BY Customer_Name`);
        let jobs = [], summary = null;
        if (customer) {
            const r = await query(`
                SELECT j.Job_Number, j.Order_Date, j.Delivery_Date,
                       ISNULL(j.Size,'—') AS Size, ISNULL(j.Label,'—') AS Label,
                       j.Label_Type, j.UPS, j.Gap_Type, j.Paper, j.Core, j.Packing,
                       j.Required_Qty, j.Produced_Qty, j.Status, j.Start_Time, j.End_Time,
                       ISNULL(e.Name,'—') AS Operator_Name, ISNULL(m.Machine_Name,'—') AS Machine_Name,
                       DATEDIFF(DAY,j.Order_Date,ISNULL(j.End_Time,GETDATE())) AS Days_Taken
                FROM Jobs j
                LEFT JOIN Employees e ON e.Employee_ID=j.Assigned_Operator_ID
                LEFT JOIN Machines  m ON m.Machine_ID =j.Assigned_Machine_ID
                WHERE j.Customer_Name=@c ORDER BY j.Job_ID DESC
            `, { c:customer });
            jobs = r.recordset;
            if (jobs.length > 0) {
                const s = await query(`
                    SELECT COUNT(*) AS Total_Jobs,
                           ISNULL(SUM(Required_Qty),0) AS Total_Required,
                           ISNULL(SUM(Produced_Qty),0) AS Total_Produced,
                           SUM(CASE WHEN Status='Completed' THEN 1 ELSE 0 END) AS Completed,
                           ISNULL(AVG(DATEDIFF(DAY,Order_Date,ISNULL(End_Time,GETDATE()))),0) AS Avg_Days
                    FROM Jobs WHERE Customer_Name=@c
                `, { c:customer });
                summary = s.recordset[0];
            }
        }
        res.render('owner/report-customer', { title:'Customer History', customers:customers.recordset, jobs, summary, selectedCustomer:customer });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Overdue Jobs
router.get('/reports/overdue', async (req, res) => {
    try {
        const r = await query(`
            SELECT j.Job_Number, j.Order_Date, j.Delivery_Date,
                   j.Customer_Name, ISNULL(j.Size,'—') AS Size, j.Label_Type,
                   j.Required_Qty, j.Produced_Qty, j.Status,
                   CASE WHEN j.Required_Qty>0 THEN CAST(j.Produced_Qty*100.0/j.Required_Qty AS DECIMAL(5,1)) ELSE 0 END AS Pct_Done,
                   DATEDIFF(DAY,j.Delivery_Date,GETDATE()) AS Days_Overdue,
                   ISNULL(e.Name,'—') AS Operator_Name, ISNULL(m.Machine_Name,'—') AS Machine_Name
            FROM Jobs j
            LEFT JOIN Employees e ON e.Employee_ID=j.Assigned_Operator_ID
            LEFT JOIN Machines  m ON m.Machine_ID =j.Assigned_Machine_ID
            WHERE j.Delivery_Date < CAST(GETDATE() AS DATE)
              AND j.Status NOT IN ('Completed','Dispatched','Cancelled')
            ORDER BY Days_Overdue DESC
        `);
        res.render('owner/report-overdue', { title:'Overdue Jobs', rows:r.recordset });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Completion Rate
router.get('/reports/completion', async (req, res) => {
    const from = req.query.from || new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const to   = req.query.to   || new Date().toISOString().split('T')[0];
    try {
        const [monthly, byType, byOp] = await Promise.all([
            query(`
                SELECT CONVERT(NVARCHAR(7),Order_Date,120) AS Month,
                       COUNT(*) AS Total,
                       SUM(CASE WHEN Status IN ('Completed','Dispatched') THEN 1 ELSE 0 END) AS Completed,
                       SUM(CASE WHEN Status='Cancelled' THEN 1 ELSE 0 END) AS Cancelled,
                       ISNULL(SUM(Required_Qty),0) AS Total_Qty, ISNULL(SUM(Produced_Qty),0) AS Produced_Qty
                FROM Jobs WHERE ISNULL(Order_Date,CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
                GROUP BY CONVERT(NVARCHAR(7),Order_Date,120) ORDER BY Month
            `, { f:from, t:to }),
            query(`
                SELECT Label_Type, COUNT(*) AS Total,
                       SUM(CASE WHEN Status IN ('Completed','Dispatched') THEN 1 ELSE 0 END) AS Completed,
                       ISNULL(SUM(Required_Qty),0) AS Total_Qty, ISNULL(SUM(Produced_Qty),0) AS Produced_Qty
                FROM Jobs WHERE ISNULL(Order_Date,CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
                GROUP BY Label_Type ORDER BY Total DESC
            `, { f:from, t:to }),
            query(`
                SELECT ISNULL(e.Name,'Unassigned') AS Operator_Name,
                       COUNT(DISTINCT j.Job_ID) AS Total_Jobs,
                       SUM(CASE WHEN j.Status IN ('Completed','Dispatched') THEN 1 ELSE 0 END) AS Completed,
                       ISNULL(SUM(j.Produced_Qty),0) AS Total_Produced,
                       AVG(CASE WHEN j.Start_Time IS NOT NULL AND j.End_Time IS NOT NULL
                                THEN DATEDIFF(MINUTE,j.Start_Time,j.End_Time) ELSE NULL END) AS Avg_Minutes
                FROM Jobs j
                LEFT JOIN Employees e ON e.Employee_ID=j.Assigned_Operator_ID
                WHERE ISNULL(j.Order_Date,CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
                GROUP BY e.Name ORDER BY Total_Produced DESC
            `, { f:from, t:to })
        ]);
        res.render('owner/report-completion', { title:'Job Completion Report', monthly:monthly.recordset, byType:byType.recordset, byOp:byOp.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Operator Productivity
router.get('/reports/operator', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT e.Name AS Operator_Name,
                   COUNT(DISTINCT j.Job_ID) AS Jobs_Handled,
                   ISNULL(SUM(jpl.Qty_Produced),0) AS Total_Produced,
                   ISNULL(SUM(DATEDIFF(MINUTE,j.Start_Time,ISNULL(j.End_Time,GETDATE())))/60.0,0) AS Hours_Worked
            FROM Job_Production_Log jpl
            JOIN Employees e ON e.Employee_ID=jpl.Operator_ID
            JOIN Jobs j      ON j.Job_ID=jpl.Job_ID
            WHERE CAST(jpl.Entry_Time AS DATE) BETWEEN @f AND @t
            GROUP BY e.Name ORDER BY Total_Produced DESC
        `, { f:from, t:to });
        res.render('owner/report-operator', { title:'Operator Report', rows:r.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Machine Utilization
router.get('/reports/machine', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT m.Machine_Name, m.Machine_Type,
                   ISNULL(SUM(ml.Total_Run_Minutes),0) AS Run_Minutes,
                   CASE WHEN (DATEDIFF(DAY,@f,@t)+1)*480>0
                        THEN CAST(ISNULL(SUM(ml.Total_Run_Minutes),0)*100.0/((DATEDIFF(DAY,@f,@t)+1)*480) AS DECIMAL(5,1))
                        ELSE 0 END AS Efficiency_Pct,
                   COUNT(DISTINCT ml.Job_ID) AS Jobs_Run
            FROM Machines m
            LEFT JOIN Machine_Log ml ON ml.Machine_ID=m.Machine_ID
                AND CAST(ml.Start_Time AS DATE) BETWEEN @f AND @t
            GROUP BY m.Machine_ID, m.Machine_Name, m.Machine_Type
            ORDER BY Efficiency_Pct DESC
        `, { f:from, t:to });
        res.render('owner/report-machine', { title:'Machine Utilization', rows:r.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// Hourly Impressions
router.get('/reports/impressions', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    const machineFilter = req.query.machine_id || '';
    try {
        const machinesR = await query(`SELECT Machine_ID, Machine_Name, Machine_Type FROM Machines ORDER BY Machine_Name`);
        let rows = [], summary = [];
        try {
            const imp = await query(`
                SELECT hi.Log_Date, hi.Log_Hour,
                       m.Machine_Name, m.Machine_Type,
                       ISNULL(e.Name,'—') AS Operator_Name,
                       ISNULL(j.Job_Number,'—') AS Job_Number,
                       ISNULL(j.Customer_Name,'—') AS Customer_Name,
                       ISNULL(j.Label,'—') AS Label, ISNULL(j.Size,'—') AS Size,
                       hi.Impressions_Count, ISNULL(hi.Remarks,'') AS Remarks
                FROM Hourly_Impressions hi
                JOIN Machines m  ON m.Machine_ID  = hi.Machine_ID
                LEFT JOIN Employees e ON e.Employee_ID = hi.Operator_ID
                LEFT JOIN Jobs j      ON j.Job_ID      = hi.Job_ID
                WHERE hi.Log_Date BETWEEN @f AND @t
                ${machineFilter ? 'AND hi.Machine_ID = @mid' : ''}
                ORDER BY hi.Log_Date DESC, hi.Machine_ID, hi.Log_Hour
            `, machineFilter ? { f:from, t:to, mid:parseInt(machineFilter) } : { f:from, t:to });
            rows = imp.recordset;

            const sumR = await query(`
                SELECT m.Machine_Name, COUNT(*) AS Total_Entries,
                       ISNULL(SUM(hi.Impressions_Count),0) AS Total_Impressions,
                       ISNULL(AVG(CAST(hi.Impressions_Count AS DECIMAL(10,2))),0) AS Avg_Per_Hour,
                       ISNULL(MAX(hi.Impressions_Count),0) AS Peak_Per_Hour
                FROM Hourly_Impressions hi
                JOIN Machines m ON m.Machine_ID=hi.Machine_ID
                WHERE hi.Log_Date BETWEEN @f AND @t
                ${machineFilter ? 'AND hi.Machine_ID = @mid' : ''}
                GROUP BY m.Machine_ID, m.Machine_Name ORDER BY Avg_Per_Hour DESC
            `, machineFilter ? { f:from, t:to, mid:parseInt(machineFilter) } : { f:from, t:to });
            summary = sumR.recordset;
        } catch(e) {
            // Hourly_Impressions table may not exist yet - show empty with install instructions
        }
        res.render('owner/report-impressions', {
            title:'Hourly Impressions', rows, summary,
            machines:machinesR.recordset, from, to, machineFilter
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

module.exports = router;
