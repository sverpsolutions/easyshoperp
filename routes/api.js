// routes/api.js
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { isLoggedIn } = require('../middleware/auth');

router.use(isLoggedIn);

// GET /api/machines
router.get('/machines', async (req, res) => {
    try {
        const r = await query(`
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
            LEFT JOIN Employees e ON e.Employee_ID = m.Current_Operator_ID
            LEFT JOIN Jobs j      ON j.Job_ID      = m.Current_Job_ID
            ORDER BY m.Machine_ID
        `);
        res.json({ success:true, data:r.recordset });
    } catch(err) { res.status(500).json({ success:false, error:err.message }); }
});

// GET /api/summary  — includes Stopped now
router.get('/summary', async (req, res) => {
    try {
        const [summary, todayProd, pendingJobs, operators] = await Promise.all([
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
            query(`SELECT COUNT(DISTINCT Current_Operator_ID) AS Count FROM Machines WHERE Current_Operator_ID IS NOT NULL`)
        ]);
        res.json({
            machines: summary.recordset[0],
            todayProduction: todayProd.recordset[0].Total,
            pendingJobs: pendingJobs.recordset[0].Count,
            operatorsOnline: operators.recordset[0].Count
        });
    } catch(err) { res.status(500).json({ error:err.message }); }
});

// GET /api/dashboard  — FULL machine data for live card updates
router.get('/dashboard', async (req, res) => {
    try {
        const [machines, summary, todayProd, pendingJobs, operatorsOnline] = await Promise.all([
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
            query(`SELECT COUNT(*) AS Total, SUM(CASE WHEN Status='Running' THEN 1 ELSE 0 END) AS Running, SUM(CASE WHEN Status='Idle' THEN 1 ELSE 0 END) AS Idle, SUM(CASE WHEN Status='Stopped' THEN 1 ELSE 0 END) AS Stopped, SUM(CASE WHEN Status='Maintenance' THEN 1 ELSE 0 END) AS Maintenance, CAST(SUM(CASE WHEN Status='Running' THEN 1.0 ELSE 0 END)/COUNT(*)*100 AS DECIMAL(5,1)) AS Utilization FROM Machines`),
            query(`SELECT ISNULL(SUM(Qty_Produced),0) AS Total FROM Job_Production_Log WHERE CAST(Entry_Time AS DATE)=CAST(GETDATE() AS DATE)`),
            query(`SELECT COUNT(*) AS Count FROM Jobs WHERE Status IN ('Pending','Assigned')`),
            query(`SELECT COUNT(DISTINCT Current_Operator_ID) AS Count FROM Machines WHERE Current_Operator_ID IS NOT NULL`)
        ]);
        res.json({
            machines:        machines.recordset,
            summary:         summary.recordset[0],
            todayProd:       todayProd.recordset[0].Total,
            pendingJobs:     pendingJobs.recordset[0].Count,
            operatorsOnline: operatorsOnline.recordset[0].Count
        });
    } catch(err) { res.status(500).json({ error:err.message }); }
});

// GET /api/jobs/pending
router.get('/jobs/pending', async (req, res) => {
    try {
        const r = await query(`
            SELECT j.Job_ID, j.Job_Number, j.Customer_Name, j.Label_Type,
                   j.Required_Qty, j.Priority, m.Machine_Name
            FROM Jobs j
            LEFT JOIN Machines m ON m.Machine_ID=j.Assigned_Machine_ID
            WHERE j.Status IN ('Pending','Assigned')
            ORDER BY j.Priority, j.Created_Date
        `);
        res.json(r.recordset);
    } catch(err) { res.status(500).json({ error:err.message }); }
});

// GET /api/production/chart — last 7 days
router.get('/production/chart', async (req, res) => {
    try {
        const r = await query(`
            SELECT CAST(Entry_Time AS DATE) AS Date, SUM(Qty_Produced) AS Total
            FROM Job_Production_Log
            WHERE Entry_Time >= DATEADD(DAY,-7,GETDATE())
            GROUP BY CAST(Entry_Time AS DATE)
            ORDER BY Date
        `);
        res.json(r.recordset);
    } catch(err) { res.status(500).json({ error:err.message }); }
});

// Pending requests (advances + job requests) for dashboard
router.get('/pending-requests', async (req, res) => {
    if (!req.session.user || !['Owner','Admin'].includes(req.session.user.role)) return res.json([]);
    try {
        const [advR, jobR] = await Promise.all([
            query(`
                SELECT a.Advance_ID AS id, 'advance' AS type,
                       e.Name AS employee_name, e.Mobile,
                       a.Amount_Requested, a.Reason,
                       CONVERT(NVARCHAR,a.Request_Date,120) AS timestamp
                FROM Employee_Advances a
                JOIN Employees e ON e.Employee_ID=a.Employee_ID
                WHERE a.Status='Pending'
                ORDER BY a.Request_Date DESC
            `),
            query(`
                SELECT r.Request_ID AS id, 'job' AS type,
                       e.Name AS employee_name, e.Mobile,
                       m.Machine_Name, r.Description,
                       CONVERT(NVARCHAR,r.Request_Date,120) AS timestamp
                FROM Job_Requests r
                JOIN Employees e ON e.Employee_ID=r.Employee_ID
                LEFT JOIN Machines m ON m.Machine_ID=r.Machine_ID
                WHERE r.Status='Pending'
                ORDER BY r.Request_Date DESC
            `)
        ]);
        res.json({ advances: advR.recordset, jobRequests: jobR.recordset });
    } catch(err) { res.json({ advances:[], jobRequests:[], error:err.message }); }
});

module.exports = router;
