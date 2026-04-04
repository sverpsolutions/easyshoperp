// routes/advances.js — Employee Advance System
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { isLoggedIn, isOwner, isAdmin } = require('../middleware/auth');
let io; try { io = require('../app').io; } catch(e) {}

// ─── OPERATOR: Request Advance ────────────────────────────
router.post('/request', isLoggedIn, async (req, res) => {
    const { amount_requested, reason } = req.body;
    const empId = req.session.user.id;
    const amt   = parseFloat(amount_requested);
    if (!amt || amt <= 0) { req.flash('error','Enter valid amount'); return res.redirect('/operator/dashboard'); }
    try {
        // Check monthly limit
        const limitR = await query(`SELECT Advance_Limit_Monthly FROM Employees WHERE Employee_ID=@id`, { id:empId });
        const limit  = parseFloat(limitR.recordset[0]?.Advance_Limit_Monthly) || 5000;
        const usedR  = await query(`
            SELECT ISNULL(SUM(Amount_Paid),0) AS Used
            FROM Employee_Advances
            WHERE Employee_ID=@id AND Status IN ('Approved','Paid')
              AND Request_Date >= DATEADD(MONTH, DATEDIFF(MONTH,0,GETDATE()), 0)
        `, { id:empId });
        const used = parseFloat(usedR.recordset[0].Used) || 0;
        if (used + amt > limit) {
            req.flash('error', `Monthly advance limit is ₹${limit.toLocaleString('en-IN')}. Already used: ₹${used.toLocaleString('en-IN')}`);
            return res.redirect('/operator/dashboard');
        }
        // Check no pending request already
        const pendR = await query(`SELECT COUNT(*) AS Cnt FROM Employee_Advances WHERE Employee_ID=@id AND Status='Pending'`, { id:empId });
        if (pendR.recordset[0].Cnt > 0) {
            req.flash('error','You already have a pending advance request. Wait for approval.');
            return res.redirect('/operator/dashboard');
        }
        await query(`INSERT INTO Employee_Advances (Employee_ID,Amount_Requested,Reason) VALUES (@id,@amt,@reason)`,
            { id:empId, amt, reason:(reason||'').trim() });
        req.flash('success', `✅ Advance request of ₹${amt.toLocaleString('en-IN')} submitted`);
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/operator/dashboard');
});

// ─── OWNER: Approve / Reject ──────────────────────────────
router.get('/', isLoggedIn, isOwner, async (req, res) => {
    try {
        const advances = await query(`
            SELECT a.*, e.Name AS Employee_Name, e.Role, e.Mobile,
                   e.Advance_Limit_Monthly,
                   ISNULL((SELECT SUM(a2.Amount_Paid) FROM Employee_Advances a2
                            WHERE a2.Employee_ID=e.Employee_ID AND a2.Status='Paid'
                              AND a2.Paid_Date >= DATEADD(MONTH,DATEDIFF(MONTH,0,GETDATE()),0)),0) AS Month_Used,
                   ap.Name AS Approved_By_Name, pb.Name AS Paid_By_Name
            FROM Employee_Advances a
            JOIN Employees e       ON e.Employee_ID = a.Employee_ID
            LEFT JOIN Employees ap ON ap.Employee_ID = a.Approved_By
            LEFT JOIN Employees pb ON pb.Employee_ID = a.Paid_By
            ORDER BY
                CASE a.Status WHEN 'Pending' THEN 1 WHEN 'Approved' THEN 2 ELSE 3 END,
                a.Request_Date DESC
        `);
        res.render('owner/advances', { title:'Employee Advances', advances:advances.recordset });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

router.post('/:id/approve', isLoggedIn, isOwner, async (req, res) => {
    const { amount_approved, notes } = req.body;
    try {
        await query(`
            UPDATE Employee_Advances SET
                Status=\'Approved\', Approved_By=@by, Approved_Date=GETDATE(),
                Amount_Approved=@amt, Notes=@notes
            WHERE Advance_ID=@id AND Status=\'Pending\'
        `, { by:req.session.user.id, amt:parseFloat(amount_approved), notes:(notes||'').trim(), id:req.params.id });
        req.flash('success','✅ Advance approved');
    } catch(err) { req.flash('error',err.message); }
    res.redirect('/owner/advances');
});

router.post('/:id/reject', isLoggedIn, isOwner, async (req, res) => {
    const { reject_reason } = req.body;
    try {
        await query(`UPDATE Employee_Advances SET Status='Rejected', Approved_By=@by,
                     Approved_Date=GETDATE(), Reject_Reason=@rr WHERE Advance_ID=@id AND Status='Pending'`,
            { by:req.session.user.id, rr:(reject_reason||'').trim(), id:req.params.id });
        req.flash('success','Advance rejected');
    } catch(err) { req.flash('error',err.message); }
    res.redirect('/owner/advances');
});

// ─── ADMIN: Give Cash ─────────────────────────────────────
router.post('/:id/pay', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).send('Forbidden');
    const { amount_paid, payment_mode, notes } = req.body;
    try {
        const advR = await query(`SELECT * FROM Employee_Advances WHERE Advance_ID=@id AND Status='Approved'`, { id:req.params.id });
        if (!advR.recordset[0]) throw new Error('Advance not found or not approved');
        const adv = advR.recordset[0];
        const amt = parseFloat(amount_paid) || parseFloat(adv.Amount_Approved);
        await query(`UPDATE Employee_Advances SET Status='Paid', Paid_By=@by,
                     Paid_Date=GETDATE(), Amount_Paid=@amt, Payment_Mode=@pm, Notes=@notes
                     WHERE Advance_ID=@id`,
            { by:req.session.user.id, amt, pm:payment_mode||'Cash', notes:(notes||'').trim(), id:req.params.id });
        // Update employee balance
        await query(`UPDATE Employees SET Total_Advance_Balance = Total_Advance_Balance + @amt
                     WHERE Employee_ID=@eid`, { amt, eid:adv.Employee_ID });
        req.flash('success', `✅ ₹${amt.toLocaleString('en-IN')} cash given`);
    } catch(err) { req.flash('error',err.message); }
    res.redirect(req.session.user.role === 'Owner' ? '/owner/advances' : '/admin/advances');
});

// ─── ADMIN view ───────────────────────────────────────────
router.get('/admin-view', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).send('Forbidden');
    try {
        const advances = await query(`
            SELECT a.*, e.Name AS Employee_Name, e.Role, e.Mobile,
                   ap.Name AS Approved_By_Name
            FROM Employee_Advances a
            JOIN Employees e       ON e.Employee_ID = a.Employee_ID
            LEFT JOIN Employees ap ON ap.Employee_ID = a.Approved_By
            WHERE a.Status IN ('Approved','Paid')
            ORDER BY CASE a.Status WHEN 'Approved' THEN 1 ELSE 2 END, a.Approved_Date DESC
        `);
        res.render('admin/advances', { title:'Cash to Give — Advances', advances:advances.recordset });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

module.exports = router;
