// routes/operator.js
const express = require('express');
let io; try { io = require('../app').io; } catch(e) {}
const router  = express.Router();
const { query, execute } = require('../config/database');
const { isLoggedIn, isOperator } = require('../middleware/auth');
const tg = require('../utils/telegram');

router.use(isLoggedIn, isOperator);

// Helper: get full job record
async function getJob(jobId) {
    const r = await query(`
        SELECT Job_ID, Job_Number, Customer_Name, Size, Label, UPS, Gap_Type, Paper, Core,
               Packing, Label_Type, Required_Qty, Produced_Qty, Status,
               ISNULL(Telegram_Notify,0) AS Telegram_Notify,
               ISNULL(Customer_Chat_ID,'') AS Customer_Chat_ID
        FROM Jobs WHERE Job_ID = @id
    `, { id: jobId });
    return r.recordset[0] || null;
}

// ─── DASHBOARD ─────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
    const opId = req.session.user.id;
    try {
        // 1. Active running/paused job (machine has this operator + job is running)
        const activeResult = await query(`
            SELECT
                m.Machine_ID, m.Machine_Name, m.Machine_Type, m.Status,
                j.Job_ID, j.Job_Number, j.Customer_Name, j.Label_Type,
                ISNULL(j.Size,'') AS Size,
                ISNULL(j.Label,'') AS Label,
                ISNULL(j.UPS,1)   AS UPS,
                ISNULL(j.Gap_Type,'') AS Gap_Type,
                ISNULL(j.Paper,'')   AS Paper,
                ISNULL(j.Core,'')    AS Core,
                ISNULL(j.Packing,'') AS Packing,
                ISNULL(j.Required_Qty,0) AS Required_Qty,
                ISNULL(j.Produced_Qty,0) AS Produced_Qty,
                j.Start_Time,
                ISNULL(DATEDIFF(MINUTE,j.Start_Time,GETDATE()),0) AS Run_Minutes,
                CASE WHEN ISNULL(j.Required_Qty,0)>0
                     THEN CAST(ISNULL(j.Produced_Qty,0)*100.0/j.Required_Qty AS DECIMAL(5,1))
                     ELSE 0 END AS Job_Progress
            FROM Machines m
            INNER JOIN Jobs j ON j.Job_ID = m.Current_Job_ID
            WHERE m.Current_Operator_ID = @id
              AND j.Status IN ('Running','Paused')
        `, { id: opId });

        // 2. All assigned jobs waiting to be started (Pending/Assigned status)
        const pendingResult = await query(`
            SELECT
                j.Job_ID, j.Job_Number, j.Customer_Name,
                ISNULL(CONVERT(NVARCHAR,j.Order_Date,105),'')    AS Order_Date,
                ISNULL(CONVERT(NVARCHAR,j.Delivery_Date,105),'') AS Delivery_Date,
                ISNULL(j.Size,'')    AS Size,
                ISNULL(j.Label,'')   AS Label,
                ISNULL(j.UPS,1)      AS UPS,
                ISNULL(j.Gap_Type,'')  AS Gap_Type,
                ISNULL(j.Paper,'')   AS Paper,
                ISNULL(j.Core,'')    AS Core,
                ISNULL(j.Packing,'') AS Packing,
                j.Label_Type,
                ISNULL(j.Required_Qty,0) AS Required_Qty,
                ISNULL(j.Produced_Qty,0) AS Produced_Qty,
                j.Status,
                ISNULL(j.Priority,5) AS Priority,
                j.Assigned_Machine_ID,
                m.Machine_ID,
                ISNULL(m.Machine_Name,'') AS Machine_Name,
                ISNULL(m.Status,'Idle')   AS Machine_Status
            FROM Jobs j
            LEFT JOIN Machines m ON m.Machine_ID = j.Assigned_Machine_ID
            WHERE j.Assigned_Operator_ID = @id
              AND j.Status IN ('Pending','Assigned')
            ORDER BY j.Priority ASC, j.Job_ID ASC
        `, { id: opId });

        // 3. Today stats
        let todayProd = 0, todayEntries = 0, completedToday = 0;
        try {
            const tp = await query(`
                SELECT ISNULL(SUM(Qty_Produced),0) AS T, COUNT(*) AS E
                FROM Job_Production_Log
                WHERE Operator_ID=@id AND CAST(Entry_Time AS DATE)=CAST(GETDATE() AS DATE)
            `, { id: opId });
            todayProd    = tp.recordset[0].T || 0;
            todayEntries = tp.recordset[0].E || 0;
        } catch(e) {}
        try {
            const ct = await query(`
                SELECT COUNT(*) AS C FROM Jobs
                WHERE Assigned_Operator_ID=@id AND Status='Completed'
                  AND End_Time IS NOT NULL AND CAST(End_Time AS DATE)=CAST(GETDATE() AS DATE)
            `, { id: opId });
            completedToday = ct.recordset[0].C || 0;
        } catch(e) {}

        const activeJob = activeResult.recordset[0] || null;

        // 4. Next queued job for this operator (next Assigned job in priority order)
        let nextJob = null;
        try {
            const nj = await query(`
                SELECT TOP 1 Job_ID, Job_Number, Customer_Name, Required_Qty
                FROM Jobs
                WHERE Assigned_Operator_ID = @id
                  AND Status IN ('Pending','Assigned')
                ORDER BY Priority ASC, Job_ID ASC
            `, { id: opId });
            nextJob = nj.recordset[0] || null;
        } catch(e) {}

        // 5. Today's attendance record
        let todayAtt = null;
        try {
            const attR = await query(`
                SELECT * FROM Employee_Attendance
                WHERE Employee_ID=@id AND Att_Date=CAST(GETDATE() AS DATE)
            `, { id: opId });
            todayAtt = attR.recordset[0] || null;
        } catch(e) {}

        // 6. Advance status for this operator
        let myAdvances = [];
        try {
            const advR = await query(`
                SELECT TOP 5 Advance_ID, Amount_Requested, Amount_Paid, Amount_Approved,
                    Status, Reject_Reason, Request_Date, Approved_Date, Paid_Date, Reason
                FROM Employee_Advances
                WHERE Employee_ID=@id
                ORDER BY Request_Date DESC
            `, { id: opId });
            myAdvances = advR.recordset;
        } catch(e) {}
        const rejectedAdv   = myAdvances.filter(a => a.Status === 'Rejected');
        const pendingAdv    = myAdvances.filter(a => a.Status === 'Pending');
        const approvedAdv   = myAdvances.filter(a => a.Status === 'Approved');

        // Machine list for job request dropdown
        let machines = [];
        try {
            const mr = await query(`SELECT Machine_ID, Machine_Name FROM Machines WHERE Status != 'Maintenance' ORDER BY Machine_Name`);
            machines = mr.recordset;
        } catch(e) {}

        res.render('operator/dashboard', {
            title: 'Operator Dashboard',
            activeJob,
            assignedJobs: pendingResult.recordset,
            todayProd, todayEntries, completedToday, nextJob,
            myAdvances, rejectedAdv, pendingAdv, approvedAdv,
            todayAtt, machines
        });
    } catch(err) {
        console.error('Operator dashboard error:', err);
        res.render('error', { title:'Error', message:err.message });
    }
});

// ─── START JOB ─────────────────────────────────────────────
router.post('/job/start', async (req, res) => {
    const { job_id, machine_id } = req.body;
    const opId   = req.session.user.id;
    const opName = req.session.user.name;

    if (!job_id || !machine_id) {
        req.flash('error', 'Cannot start: machine not assigned to this job. Ask supervisor to assign a machine first.');
        return res.redirect('/operator/dashboard');
    }
    try {
        // Check machine is not busy with another job
        const mc = await query(`SELECT Status, Current_Job_ID FROM Machines WHERE Machine_ID=@mid`, { mid: parseInt(machine_id) });
        if (!mc.recordset[0]) {
            req.flash('error', 'Machine not found');
            return res.redirect('/operator/dashboard');
        }
        const machine = mc.recordset[0];
        if (machine.Status === 'Running' && machine.Current_Job_ID && machine.Current_Job_ID !== parseInt(job_id)) {
            req.flash('error', 'Machine is running another job. Please stop that job first.');
            return res.redirect('/operator/dashboard');
        }
        if (machine.Status === 'Maintenance') {
            req.flash('error', 'Machine is under maintenance. Contact supervisor.');
            return res.redirect('/operator/dashboard');
        }

        await execute('sp_StartJob', {
            Job_ID:     parseInt(job_id),
            Machine_ID: parseInt(machine_id),
            Operator_ID: parseInt(opId)
        });
        req.flash('success', '▶️ Job started! Machine is now RUNNING.');

        // Telegram (async, don't block response)
        Promise.all([
            query(`SELECT Machine_Name FROM Machines WHERE Machine_ID=@id`, { id: parseInt(machine_id) }),
            getJob(parseInt(job_id))
        ]).then(([machR, job]) => {
            if (job && machR.recordset[0]) {
                tg.onJobStarted({ job, operatorName:opName, machineName:machR.recordset[0].Machine_Name }).catch(()=>{});
            }
        }).catch(()=>{});

    } catch(err) {
        console.error('Start job error:', err);
        req.flash('error', 'Error starting job: ' + err.message);
    }
    res.redirect('/operator/dashboard');
});

// ─── LOG QTY ───────────────────────────────────────────────
router.post('/job/log', async (req, res) => {
    const { job_id, machine_id, qty } = req.body;
    const opId   = req.session.user.id;
    const opName = req.session.user.name;
    const q = parseInt(qty);

    if (!job_id || !machine_id || isNaN(q) || q <= 0) {
        req.flash('error', 'Enter a valid quantity greater than 0');
        return res.redirect('/operator/dashboard');
    }
    try {
        await execute('sp_LogProduction', {
            Job_ID:     parseInt(job_id),
            Operator_ID: parseInt(opId),
            Machine_ID: parseInt(machine_id),
            Qty:        q
        });
        req.flash('success', `✅ Logged ${q.toLocaleString()} units`);

        // Telegram milestone check
        getJob(parseInt(job_id)).then(job => {
            if (job) tg.onProductionLogged({ job, operatorName:opName, qty:q, newTotal:job.Produced_Qty }).catch(()=>{});
        }).catch(()=>{});

    } catch(err) {
        console.error('Log production error:', err);
        req.flash('error', 'Error logging qty: ' + err.message);
    }
    res.redirect('/operator/dashboard');
});

// ─── STOP / COMPLETE ───────────────────────────────────────
router.post('/job/stop', async (req, res) => {
    const { job_id, machine_id, final_qty, status } = req.body;
    const opName = req.session.user.name;

    if (!job_id || !machine_id) {
        req.flash('error', 'Missing job or machine information');
        return res.redirect('/operator/dashboard');
    }
    try {
        const fQty = parseInt(final_qty) || 0;

        // Fetch job before updating
        const [job, machR] = await Promise.all([
            getJob(parseInt(job_id)),
            query(`SELECT Machine_Name FROM Machines WHERE Machine_ID=@id`, { id: parseInt(machine_id) })
        ]);

        await execute('sp_StopJob', {
            Job_ID:       parseInt(job_id),
            Machine_ID:   parseInt(machine_id),
            Produced_Qty: fQty,
            Status:       status || 'Completed'
        });

        const msgs = { Completed:'✅ Job completed!', Paused:'⏸ Job paused.', Cancelled:'❌ Job cancelled.' };
        req.flash('success', msgs[status] || 'Job stopped.');

        // Telegram
        if (job && machR.recordset[0]) {
            const machineName = machR.recordset[0].Machine_Name;
            if (status === 'Completed') {
                tg.onJobCompleted({ job, operatorName:opName, machineName, finalQty:fQty }).catch(()=>{});
            } else {
                tg.onStatusChanged({ job, newStatus:status||'Completed', changedBy:opName }).catch(()=>{});
            }
        }
    } catch(err) {
        console.error('Stop job error:', err);
        req.flash('error', 'Error stopping job: ' + err.message);
    }
    res.redirect('/operator/dashboard');
});

// ─── PAUSE ─────────────────────────────────────────────────
router.post('/job/pause', async (req, res) => {
    const { job_id, machine_id } = req.body;
    try {
        await query(`UPDATE Jobs SET Status='Paused' WHERE Job_ID=@id`, { id: parseInt(job_id) });
        await query(`UPDATE Machines SET Status='Idle', Current_Job_ID=NULL WHERE Machine_ID=@mid`, { mid: parseInt(machine_id) });
        req.flash('success', '⏸ Job paused. Machine is now Idle.');
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/operator/dashboard');
});

// ─── JOB REQUEST (operator asks for work) ─────────────────
router.post('/job-request', isLoggedIn, async (req, res) => {
    const { machine_id, description } = req.body;
    const empId = req.session.user.id;
    const empName = req.session.user.name;
    try {
        // Get machine name if provided
        let machineName = null;
        if (machine_id) {
            const mr = await query(`SELECT Machine_Name FROM Machines WHERE Machine_ID=@id`, { id:parseInt(machine_id) });
            machineName = mr.recordset[0]?.Machine_Name || null;
        }
        // Save to DB
        await query(`
            INSERT INTO Job_Requests (Employee_ID, Machine_ID, Request_Type, Description, Status)
            VALUES (@eid, @mid, 'Job', @desc, 'Pending')
        `, { eid:empId, mid:machine_id||null, desc:(description||'').trim() });

        // Socket notification to owner dashboard
        try {
            if(io) io.emit('new-job-request', {
                type:          'job',
                employee_name: empName,
                employee_id:   empId,
                machine_name:  machineName,
                machine_id:    machine_id || null,
                description:   (description||'').trim(),
                timestamp:     new Date().toISOString(),
                message:       `New Job Request by ${empName}${machineName?' on '+machineName:''}`
            });
        } catch(e) {}

        req.flash('success', '✅ Job request sent to owner');
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/operator/dashboard');
});

// ─── ACKNOWLEDGE JOB REQUEST (owner/admin) ─────────────────
router.post('/job-request/:id/ack', async (req, res) => {
    if (!req.session.user || !['Owner','Admin'].includes(req.session.user.role)) return res.status(403).end();
    try {
        await query(`
            UPDATE Job_Requests SET Status='Acknowledged', Acknowledged_By=@by, Acknowledged_At=GETDATE()
            WHERE Request_ID=@id
        `, { by:req.session.user.id, id:parseInt(req.params.id) });
        res.json({ ok:true });
    } catch(err) { res.json({ ok:false, error:err.message }); }
});

module.exports = router;

// ─── LOG HOURLY IMPRESSIONS ────────────────────────────────
router.post('/log-impressions', async (req, res) => {
    const { machine_id, job_id, impressions_count, remarks } = req.body;
    const opId = req.session.user.id;
    const count = parseInt(impressions_count);
    if (!machine_id || isNaN(count) || count < 0) {
        req.flash('error', 'Enter valid impression count (0 or above)');
        return res.redirect('/operator/dashboard');
    }
    try {
        const now      = new Date();
        const logDate  = now.toISOString().split('T')[0];
        const logHour  = now.getHours();
        await query(`
            INSERT INTO Hourly_Impressions
                (Machine_ID, Operator_ID, Job_ID, Log_Date, Log_Hour, Impressions_Count, Remarks)
            VALUES (@mid, @opId, @jid, @date, @hour, @cnt, @rem)
        `, {
            mid:  parseInt(machine_id),
            opId: parseInt(opId),
            jid:  job_id && job_id !== '' ? parseInt(job_id) : null,
            date: logDate,
            hour: logHour,
            cnt:  count,
            rem:  (remarks || '').trim().substring(0, 200)
        });
        req.flash('success', `✅ Logged ${count.toLocaleString()} impressions for hour ${logHour}:00`);
    } catch(err) {
        console.error('Impression log error:', err);
        req.flash('error', 'Error logging impressions: ' + err.message);
    }
    res.redirect('/operator/dashboard');
});

// ─── IMPRESSIONS HISTORY (API for operator) ────────────────
router.get('/impressions-today', async (req, res) => {
    const opId = req.session.user.id;
    try {
        const r = await query(`
            SELECT hi.Log_Hour, hi.Impressions_Count, hi.Remarks,
                   m.Machine_Name, ISNULL(j.Job_Number,'—') AS Job_Number
            FROM Hourly_Impressions hi
            JOIN Machines m ON m.Machine_ID=hi.Machine_ID
            LEFT JOIN Jobs j ON j.Job_ID=hi.Job_ID
            WHERE hi.Operator_ID=@id AND hi.Log_Date=CAST(GETDATE() AS DATE)
            ORDER BY hi.Log_Hour DESC
        `, { id: parseInt(opId) });
        res.json(r.recordset);
    } catch(err) { res.status(500).json({ error:err.message }); }
});
