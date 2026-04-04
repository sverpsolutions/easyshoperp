// routes/employees.js
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const { query } = require('../config/database');
const { isLoggedIn, isOwner } = require('../middleware/auth');

router.use(isLoggedIn, isOwner);

// ─── LIST ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const [emps, advSummary] = await Promise.all([
            query(`SELECT e.*,
                   ISNULL((SELECT SUM(a.Amount_Paid) FROM Employee_Advances a
                           WHERE a.Employee_ID=e.Employee_ID AND a.Status='Paid'
                             AND a.Is_Deducted=0),0) AS Pending_Recovery,
                   ISNULL((SELECT SUM(a.Amount_Paid) FROM Employee_Advances a
                           WHERE a.Employee_ID=e.Employee_ID AND a.Status='Paid'
                             AND a.Paid_Date >= DATEADD(MONTH, DATEDIFF(MONTH,0,GETDATE()), 0)),0) AS This_Month_Advance
                   FROM Employees e WHERE e.Is_Active=1 ORDER BY e.Role, e.Name`),
            query(`SELECT Employee_ID, COUNT(*) AS Pending_Count, SUM(Amount_Requested) AS Pending_Amt
                   FROM Employee_Advances WHERE Status='Pending' GROUP BY Employee_ID`)
        ]);
        const pendingMap = {};
        advSummary.recordset.forEach(a => { pendingMap[a.Employee_ID] = a; });
        res.render('owner/employees', { title:'Employee Master', employees:emps.recordset, pendingMap });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── CREATE ───────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { name, role, mobile, username, password, father_name, address, aadhar_no,
            join_date, monthly_salary, bank_name, bank_account, bank_ifsc,
            advance_limit_monthly, emergency_contact } = req.body;
    if (!name || !role || !username || !password) {
        req.flash('error','Name, Role, Username and Password are required');
        return res.redirect('/owner/employees');
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        await query(`
            INSERT INTO Employees (Name,Role,Mobile,Username,Password_Hash,Father_Name,Address,
                Aadhar_No,Join_Date,Monthly_Salary,Bank_Name,Bank_Account,Bank_IFSC,
                Advance_Limit_Monthly,Emergency_Contact,Is_Active)
            VALUES (@name,@role,@mob,@uname,@hash,@fn,@addr,@aadhar,@jd,@sal,@bname,@bacc,@bifsc,@alimit,@emerg,1)
        `, {
            name:name.trim(), role, mob:(mobile||'').trim(), uname:username.trim(), hash,
            fn:(father_name||'').trim(), addr:(address||'').trim(),
            aadhar:(aadhar_no||'').trim(),
            jd:join_date||null, sal:parseFloat(monthly_salary)||0,
            bname:(bank_name||'').trim(), bacc:(bank_account||'').trim(),
            bifsc:(bank_ifsc||'').trim(),
            alimit:parseFloat(advance_limit_monthly)||5000,
            emerg:(emergency_contact||'').trim()
        });
        req.flash('success', `✅ Employee "${name}" added`);
    } catch(err) {
        req.flash('error', err.message.includes('Unique') ? 'Username already exists' : err.message);
    }
    res.redirect('/owner/employees');
});

// ─── DETAIL / PROFILE ─────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const [emp, advances] = await Promise.all([
            query(`SELECT * FROM Employees WHERE Employee_ID=@id`, { id:req.params.id }),
            query(`
                SELECT a.*, ap.Name AS Approved_By_Name, pb.Name AS Paid_By_Name
                FROM Employee_Advances a
                LEFT JOIN Employees ap ON ap.Employee_ID=a.Approved_By
                LEFT JOIN Employees pb ON pb.Employee_ID=a.Paid_By
                WHERE a.Employee_ID=@id ORDER BY a.Request_Date DESC
            `, { id:req.params.id })
        ]);

        const jobsR = await query(`SELECT TOP 20 j.Job_Number,j.Customer_Name,j.Status,j.Start_Time,j.End_Time,
               ISNULL(m.Machine_Name,'—') AS Machine_Name
               FROM Jobs j LEFT JOIN Machines m ON m.Machine_ID=j.Assigned_Machine_ID
               WHERE j.Assigned_Operator_ID=@id ORDER BY j.Job_ID DESC`, { id:req.params.id });

        if (!emp.recordset[0]) { req.flash('error','Employee not found'); return res.redirect('/owner/employees'); }

        // Summary stats
        const advStats = await query(`
            SELECT
                ISNULL(SUM(CASE WHEN Status='Paid' AND Is_Deducted=0 THEN Amount_Paid ELSE 0 END),0) AS Balance_To_Recover,
                ISNULL(SUM(CASE WHEN Status='Paid' THEN Amount_Paid ELSE 0 END),0) AS Total_Taken,
                COUNT(CASE WHEN Status='Pending' THEN 1 END) AS Pending_Count,
                ISNULL(SUM(CASE WHEN Status='Paid' AND Paid_Date >= DATEADD(MONTH,DATEDIFF(MONTH,0,GETDATE()),0)
                           THEN Amount_Paid ELSE 0 END),0) AS This_Month
            FROM Employee_Advances WHERE Employee_ID=@id`, { id:req.params.id });

        res.render('owner/employee-detail', {
            title:`${emp.recordset[0].Name} — Profile`,
            employee:emp.recordset[0], advances:advances.recordset,
            jobs:jobsR.recordset, advStats:advStats.recordset[0]
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── UPDATE PROFILE ───────────────────────────────────────
router.post('/:id/update', async (req, res) => {
    const { name, role, mobile, father_name, address, aadhar_no, join_date,
            monthly_salary, bank_name, bank_account, bank_ifsc,
            advance_limit_monthly, emergency_contact, is_active } = req.body;
    try {
        await query(`
            UPDATE Employees SET Name=@n,Role=@r,Mobile=@mob,Father_Name=@fn,Address=@addr,
                Aadhar_No=@adh,Join_Date=@jd,Monthly_Salary=@sal,Bank_Name=@bn,
                Bank_Account=@ba,Bank_IFSC=@bi,Advance_Limit_Monthly=@al,
                Emergency_Contact=@ec,Is_Active=@active
            WHERE Employee_ID=@id
        `, {
            n:name.trim(),r:role,mob:(mobile||'').trim(),fn:(father_name||'').trim(),
            addr:(address||'').trim(),adh:(aadhar_no||'').trim(),jd:join_date||null,
            sal:parseFloat(monthly_salary)||0,bn:(bank_name||'').trim(),
            ba:(bank_account||'').trim(),bi:(bank_ifsc||'').trim(),
            al:parseFloat(advance_limit_monthly)||5000,
            ec:(emergency_contact||'').trim(),active:is_active?1:0,id:req.params.id
        });
        req.flash('success','✅ Employee updated');
    } catch(err) { req.flash('error',err.message); }
    res.redirect(`/owner/employees/${req.params.id}`);
});

// ─── RESET PASSWORD ───────────────────────────────────────
router.post('/:id/reset-password', async (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 4) { req.flash('error','Min 4 chars'); return res.redirect(`/owner/employees/${req.params.id}`); }
    try {
        const hash = await bcrypt.hash(new_password, 10);
        await query(`UPDATE Employees SET Password_Hash=@h WHERE Employee_ID=@id`, { h:hash, id:req.params.id });
        req.flash('success','✅ Password reset');
    } catch(err) { req.flash('error',err.message); }
    res.redirect(`/owner/employees/${req.params.id}`);
});

// ─── MARK ADVANCE DEDUCTED ────────────────────────────────
router.post('/:id/advance/:aid/deduct', async (req, res) => {
    const { deduct_month } = req.body;
    try {
        await query(`UPDATE Employee_Advances SET Is_Deducted=1, Deduct_Month=@dm WHERE Advance_ID=@aid AND Employee_ID=@eid`,
            { dm:deduct_month, aid:req.params.aid, eid:req.params.id });
        // Recalculate balance
        await query(`UPDATE Employees SET Total_Advance_Balance =
            (SELECT ISNULL(SUM(Amount_Paid),0) FROM Employee_Advances
             WHERE Employee_ID=@eid AND Status='Paid' AND Is_Deducted=0)
            WHERE Employee_ID=@eid`, { eid:req.params.id });
        req.flash('success','✅ Marked as deducted from salary');
    } catch(err) { req.flash('error',err.message); }
    res.redirect(`/owner/employees/${req.params.id}`);
});

module.exports = router;

// ─── PHOTO UPLOAD ─────────────────────────────────────────
const { photoUpload, docUpload } = require('../utils/upload');

router.post('/:id/upload-photo', isLoggedIn, photoUpload.single('photo'), async (req, res) => {
    // allow self-upload (operator uploads their own) or owner
    const empId = parseInt(req.params.id);
    const isSelf = req.session.user.id === empId;
    if (!isSelf && !['Owner','Admin'].includes(req.session.user.role)) return res.status(403).send('Forbidden');
    try {
        if (!req.file) throw new Error('No file uploaded');
        const photoPath = '/uploads/employees/' + req.file.filename;
        await query(`UPDATE Employees SET Photo_Path=@p WHERE Employee_ID=@id`, { p: photoPath, id: empId });
        req.flash('success', '✅ Photo updated');
    } catch(err) { req.flash('error', err.message); }
    const back = req.session.user.role === 'Operator' ? '/operator/dashboard' : `/owner/employees/${empId}`;
    res.redirect(back);
});

// ─── DOCUMENT UPLOAD ──────────────────────────────────────
router.post('/:id/upload-doc', isLoggedIn, isOwner, docUpload.single('document'), async (req, res) => {
    const { doc_type } = req.body; // 'resume' or 'aadhar'
    try {
        if (!req.file) throw new Error('No file uploaded');
        if (!['resume','aadhar'].includes(doc_type)) throw new Error('Invalid doc type');
        const docPath = '/uploads/documents/' + req.file.filename;
        const col = doc_type === 'resume' ? 'Resume_Path' : 'Aadhar_Path';
        await query(`UPDATE Employees SET ${col}=@p WHERE Employee_ID=@id`, { p: docPath, id: req.params.id });
        req.flash('success', `✅ ${doc_type === 'resume' ? 'Resume' : 'Aadhar Card'} uploaded`);
    } catch(err) { req.flash('error', err.message); }
    res.redirect(`/owner/employees/${req.params.id}`);
});
