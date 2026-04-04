// routes/reports.js — All Owner Report Routes
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { isLoggedIn, isOwner } = require('../middleware/auth');

router.use(isLoggedIn, isOwner);

// ─── INDEX ─────────────────────────────────────────────────
router.get('/', (req, res) => res.render('owner/reports', { title:'Reports & Analytics' }));

// ─── DAILY PRODUCTION ──────────────────────────────────────
router.get('/daily', async (req, res) => {
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

// ─── LABEL TYPE SUMMARY ────────────────────────────────────
router.get('/label-type', async (req, res) => {
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
            WHERE ISNULL(j.Order_Date, CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
            GROUP BY j.Label_Type
            ORDER BY Total_Required DESC
        `, { f:from, t:to });
        res.render('owner/report-label-type', { title:'Label Type Report', rows:r.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── LABEL NAME BREAKDOWN ──────────────────────────────────
router.get('/label-name', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT ISNULL(j.Label,'(Not Specified)') AS Label_Name,
                   ISNULL(j.Size,'—') AS Size,
                   ISNULL(j.Paper,'—') AS Paper,
                   ISNULL(j.Gap_Type,'—') AS Gap_Type,
                   COUNT(DISTINCT j.Job_ID) AS Total_Jobs,
                   ISNULL(SUM(j.Required_Qty),0) AS Total_Required,
                   ISNULL(SUM(j.Produced_Qty),0) AS Total_Produced,
                   COUNT(DISTINCT j.Customer_Name) AS Unique_Customers
            FROM Jobs j
            WHERE ISNULL(j.Order_Date, CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
            GROUP BY j.Label, j.Size, j.Paper, j.Gap_Type
            ORDER BY Total_Required DESC
        `, { f:from, t:to });
        res.render('owner/report-label-name', { title:'Label Breakdown Report', rows:r.recordset, from, to });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── OPERATOR × LABEL TYPE ─────────────────────────────────
router.get('/operator-label', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT e.Name AS Operator_Name,
                   j.Label_Type,
                   ISNULL(j.Label,'—') AS Label_Name,
                   ISNULL(j.Size,'—') AS Size,
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

// ─── CUSTOMER HISTORY ──────────────────────────────────────
router.get('/customer', async (req, res) => {
    const customer = (req.query.customer || '').trim();
    try {
        const customers = await query(`SELECT DISTINCT Customer_Name FROM Jobs ORDER BY Customer_Name`);
        let jobs = [], summary = null;
        if (customer) {
            const r = await query(`
                SELECT j.Job_Number, j.Order_Date, j.Delivery_Date,
                       ISNULL(j.Size,'—') AS Size, ISNULL(j.Label,'—') AS Label,
                       j.Label_Type, j.UPS, j.Gap_Type, j.Paper, j.Core, j.Packing,
                       j.Required_Qty, j.Produced_Qty, j.Status,
                       j.Start_Time, j.End_Time,
                       ISNULL(e.Name,'—') AS Operator_Name,
                       ISNULL(m.Machine_Name,'—') AS Machine_Name,
                       DATEDIFF(DAY, j.Order_Date, ISNULL(j.End_Time, GETDATE())) AS Days_Taken
                FROM Jobs j
                LEFT JOIN Employees e ON e.Employee_ID=j.Assigned_Operator_ID
                LEFT JOIN Machines  m ON m.Machine_ID =j.Assigned_Machine_ID
                WHERE j.Customer_Name = @c
                ORDER BY j.Job_ID DESC
            `, { c:customer });
            jobs = r.recordset;
            if (jobs.length > 0) {
                const sumR = await query(`
                    SELECT COUNT(*) AS Total_Jobs,
                           ISNULL(SUM(Required_Qty),0) AS Total_Required,
                           ISNULL(SUM(Produced_Qty),0) AS Total_Produced,
                           SUM(CASE WHEN Status='Completed' THEN 1 ELSE 0 END) AS Completed,
                           ISNULL(AVG(DATEDIFF(DAY,Order_Date,ISNULL(End_Time,GETDATE()))),0) AS Avg_Days
                    FROM Jobs WHERE Customer_Name=@c
                `, { c:customer });
                summary = sumR.recordset[0];
            }
        }
        res.render('owner/report-customer', { title:'Customer History', customers:customers.recordset, jobs, summary, selectedCustomer:customer });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── OVERDUE JOBS ──────────────────────────────────────────
router.get('/overdue', async (req, res) => {
    try {
        const r = await query(`
            SELECT j.Job_Number, j.Order_Date, j.Delivery_Date,
                   j.Customer_Name, ISNULL(j.Size,'—') AS Size, j.Label_Type,
                   j.Required_Qty, j.Produced_Qty, j.Status,
                   CASE WHEN j.Required_Qty>0 THEN CAST(j.Produced_Qty*100.0/j.Required_Qty AS DECIMAL(5,1)) ELSE 0 END AS Pct_Done,
                   DATEDIFF(DAY,j.Delivery_Date,GETDATE()) AS Days_Overdue,
                   ISNULL(e.Name,'—') AS Operator_Name,
                   ISNULL(m.Machine_Name,'—') AS Machine_Name
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

// ─── COMPLETION RATE ───────────────────────────────────────
router.get('/completion', async (req, res) => {
    const from = req.query.from || new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const to   = req.query.to   || new Date().toISOString().split('T')[0];
    try {
        const [monthly, byType, byOp] = await Promise.all([
            query(`
                SELECT CONVERT(NVARCHAR(7), Order_Date, 120) AS Month,
                       COUNT(*) AS Total,
                       SUM(CASE WHEN Status IN ('Completed','Dispatched') THEN 1 ELSE 0 END) AS Completed,
                       SUM(CASE WHEN Status='Cancelled' THEN 1 ELSE 0 END) AS Cancelled,
                       ISNULL(SUM(Required_Qty),0) AS Total_Qty,
                       ISNULL(SUM(Produced_Qty),0) AS Produced_Qty
                FROM Jobs WHERE ISNULL(Order_Date,CAST(GETDATE() AS DATE)) BETWEEN @f AND @t
                GROUP BY CONVERT(NVARCHAR(7), Order_Date, 120)
                ORDER BY Month
            `, { f:from, t:to }),
            query(`
                SELECT Label_Type,
                       COUNT(*) AS Total,
                       SUM(CASE WHEN Status IN ('Completed','Dispatched') THEN 1 ELSE 0 END) AS Completed,
                       ISNULL(SUM(Required_Qty),0) AS Total_Qty,
                       ISNULL(SUM(Produced_Qty),0) AS Produced_Qty
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

// ─── OPERATOR PRODUCTIVITY ─────────────────────────────────
router.get('/operator', async (req, res) => {
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

// ─── MACHINE UTILIZATION ───────────────────────────────────
router.get('/machine', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    try {
        const r = await query(`
            SELECT m.Machine_Name, m.Machine_Type,
                   ISNULL(SUM(ml.Total_Run_Minutes),0) AS Run_Minutes,
                   CASE WHEN (DATEDIFF(DAY,@f,@t)+1)*480 > 0
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

// ─── HOURLY IMPRESSIONS ────────────────────────────────────
router.get('/impressions', async (req, res) => {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to   = req.query.to   || from;
    const machineFilter = req.query.machine_id || '';
    try {
        const [impressions, machines] = await Promise.all([
            query(`
                SELECT hi.Log_Date, hi.Log_Hour,
                       m.Machine_Name, m.Machine_Type,
                       ISNULL(e.Name,'—') AS Operator_Name,
                       ISNULL(j.Job_Number,'—') AS Job_Number,
                       ISNULL(j.Customer_Name,'—') AS Customer_Name,
                       ISNULL(j.Label,'—') AS Label,
                       ISNULL(j.Size,'—') AS Size,
                       hi.Impressions_Count,
                       ISNULL(hi.Remarks,'') AS Remarks
                FROM Hourly_Impressions hi
                JOIN Machines m  ON m.Machine_ID  = hi.Machine_ID
                LEFT JOIN Employees e ON e.Employee_ID = hi.Operator_ID
                LEFT JOIN Jobs j      ON j.Job_ID      = hi.Job_ID
                WHERE hi.Log_Date BETWEEN @f AND @t
                ${machineFilter ? 'AND hi.Machine_ID = @mid' : ''}
                ORDER BY hi.Log_Date DESC, hi.Machine_ID, hi.Log_Hour
            `, machineFilter ? { f:from, t:to, mid:parseInt(machineFilter) } : { f:from, t:to }),
            query(`SELECT Machine_ID, Machine_Name, Machine_Type FROM Machines ORDER BY Machine_Name`)
        ]);

        // Summary: avg impressions per hour per machine
        const summaryR = await query(`
            SELECT m.Machine_Name,
                   COUNT(*) AS Total_Entries,
                   ISNULL(SUM(hi.Impressions_Count),0) AS Total_Impressions,
                   ISNULL(AVG(CAST(hi.Impressions_Count AS DECIMAL(10,2))),0) AS Avg_Per_Hour,
                   ISNULL(MAX(hi.Impressions_Count),0) AS Peak_Per_Hour
            FROM Hourly_Impressions hi
            JOIN Machines m ON m.Machine_ID=hi.Machine_ID
            WHERE hi.Log_Date BETWEEN @f AND @t
            ${machineFilter ? 'AND hi.Machine_ID = @mid' : ''}
            GROUP BY m.Machine_ID, m.Machine_Name
            ORDER BY Avg_Per_Hour DESC
        `, machineFilter ? { f:from, t:to, mid:parseInt(machineFilter) } : { f:from, t:to });

        res.render('owner/report-impressions', {
            title:'Hourly Impressions',
            rows:impressions.recordset,
            summary:summaryR.recordset,
            machines:machines.recordset,
            from, to, machineFilter
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

module.exports = router;
