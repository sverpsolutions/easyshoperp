// routes/attendance.js — Full Attendance System
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { isLoggedIn } = require('../middleware/auth');

// ─── OPERATOR: Mark IN/OUT (self) ────────────────────────
router.post('/mark', isLoggedIn, async (req, res) => {
    const { action } = req.body;
    const empId = req.session.user.id;
    const today = new Date().toISOString().split('T')[0];
    try {
        if (action === 'in') {
            await query(`
                MERGE Employee_Attendance AS tgt
                USING (SELECT @id AS Employee_ID, CAST(@dt AS DATE) AS Att_Date) AS src
                ON tgt.Employee_ID=src.Employee_ID AND tgt.Att_Date=src.Att_Date
                WHEN MATCHED AND tgt.In_Time IS NULL THEN
                    UPDATE SET In_Time=GETDATE(), Status='Present'
                WHEN NOT MATCHED THEN
                    INSERT (Employee_ID,Att_Date,In_Time,Status)
                    VALUES (@id, CAST(@dt AS DATE), GETDATE(), 'Present');
            `, { id:empId, dt:today });
            req.flash('success', '✅ IN marked — ' + new Date().toLocaleTimeString('en-IN'));
        } else if (action === 'out') {
            const attR = await query(`SELECT * FROM Employee_Attendance WHERE Employee_ID=@id AND Att_Date=CAST(@dt AS DATE)`, { id:empId, dt:today });
            const att = attR.recordset[0];
            if (!att || !att.In_Time) { req.flash('error','Mark IN first'); return res.redirect('/operator/dashboard'); }
            if (att.Out_Time)         { req.flash('error','Already marked OUT'); return res.redirect('/operator/dashboard'); }
            const hrs = Math.round((new Date() - new Date(att.In_Time)) / 3600000 * 100) / 100;
            const st  = hrs >= 7 ? 'Present' : hrs >= 4 ? 'Half Day' : 'Half Day';
            await query(`UPDATE Employee_Attendance SET Out_Time=GETDATE(), Total_Hours=@hrs, Status=@st WHERE Employee_ID=@id AND Att_Date=CAST(@dt AS DATE)`,
                { hrs, st, id:empId, dt:today });
            req.flash('success', `✅ OUT marked — ${hrs} hrs worked`);
        }
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/operator/dashboard');
});

// ─── OWNER/ADMIN: Dashboard ───────────────────────────────
router.get('/', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).redirect('/');
    const date = req.query.date || new Date().toISOString().split('T')[0];
    try {
        const [allEmps, attRecords, shifts, roster] = await Promise.all([
            query(`SELECT Employee_ID, Name, Role, Mobile, Photo_Path,
                   Is_Active FROM Employees WHERE Is_Active=1 ORDER BY Role, Name`),
            query(`
                SELECT a.*, s.Shift_Name
                FROM Employee_Attendance a
                LEFT JOIN Shifts s ON s.Shift_ID=a.Shift_ID
                WHERE a.Att_Date=CAST(@dt AS DATE)
            `, { dt:date }),
            query(`SELECT * FROM Shifts WHERE Is_Active=1 ORDER BY Shift_ID`),
            query(`
                SELECT r.*, s.Shift_Name
                FROM Roster r
                LEFT JOIN Shifts s ON s.Shift_ID=r.Shift_ID
                WHERE r.Roster_Date=CAST(@dt AS DATE)
            `, { dt:date })
        ]);

        // Build attendance map by Employee_ID
        const attMap = {};
        attRecords.recordset.forEach(a => { attMap[a.Employee_ID] = a; });

        // Build roster map
        const rosterMap = {};
        roster.recordset.forEach(r => { rosterMap[r.Employee_ID] = r; });

        // Merge employees with their attendance & roster
        const employees = allEmps.recordset.map(e => ({
            ...e,
            att:    attMap[e.Employee_ID] || null,
            roster: rosterMap[e.Employee_ID] || null
        }));

        const summary = {
            present:  employees.filter(e => e.att?.Status === 'Present').length,
            halfday:  employees.filter(e => e.att?.Status === 'Half Day').length,
            absent:   employees.filter(e => !e.att && !rosterMap[e.Employee_ID]?.Is_Off_Day).length,
            off:      employees.filter(e => rosterMap[e.Employee_ID]?.Is_Off_Day).length,
            late:     employees.filter(e => e.att?.Status === 'Late').length,
            total:    employees.length
        };

        res.render('owner/attendance', {
            title:'Attendance', date, employees, shifts:shifts.recordset, summary
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── OWNER/ADMIN: Mark/Update attendance for any employee ─
router.post('/manual', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).redirect('/');
    const { employee_id, att_date, status, in_time, out_time, shift_id, remarks } = req.body;
    try {
        let hours = null;
        if (in_time && out_time) {
            hours = Math.round(
                (new Date(`${att_date}T${out_time}`) - new Date(`${att_date}T${in_time}`)) / 3600000 * 100
            ) / 100;
        }
        const inDt  = in_time  ? `${att_date} ${in_time}`  : null;
        const outDt = out_time ? `${att_date} ${out_time}` : null;

        await query(`
            MERGE Employee_Attendance AS tgt
            USING (SELECT @eid AS Employee_ID, CAST(@dt AS DATE) AS Att_Date) AS src
            ON tgt.Employee_ID=src.Employee_ID AND tgt.Att_Date=src.Att_Date
            WHEN MATCHED THEN UPDATE SET
                Status=@st, Shift_ID=@sid,
                In_Time=CASE WHEN @indt IS NOT NULL THEN CAST(@indt AS DATETIME) ELSE In_Time END,
                Out_Time=CASE WHEN @outdt IS NOT NULL THEN CAST(@outdt AS DATETIME) ELSE Out_Time END,
                Total_Hours=@hrs, Remarks=@rem, Marked_By=@by
            WHEN NOT MATCHED THEN INSERT (Employee_ID,Att_Date,Status,Shift_ID,In_Time,Out_Time,Total_Hours,Remarks,Marked_By)
            VALUES (@eid, CAST(@dt AS DATE), @st, @sid,
                CASE WHEN @indt IS NOT NULL THEN CAST(@indt AS DATETIME) ELSE NULL END,
                CASE WHEN @outdt IS NOT NULL THEN CAST(@outdt AS DATETIME) ELSE NULL END,
                @hrs, @rem, @by);
        `, {
            eid:parseInt(employee_id), dt:att_date,
            st:status||'Present', sid:shift_id||null,
            indt:inDt, outdt:outDt, hrs:hours,
            rem:(remarks||'').trim(), by:req.session.user.id
        });
        req.flash('success','✅ Attendance saved');
    } catch(err) { req.flash('error', err.message); }
    res.redirect(`/attendance?date=${att_date}`);
});

// ─── BULK MARK ALL PRESENT ────────────────────────────────
router.post('/bulk-present', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).redirect('/');
    const { att_date, shift_id } = req.body;
    try {
        // Get all active operators not yet marked today
        const emps = await query(`
            SELECT e.Employee_ID FROM Employees e
            WHERE e.Is_Active=1 AND e.Role='Operator'
              AND NOT EXISTS (SELECT 1 FROM Employee_Attendance a
                              WHERE a.Employee_ID=e.Employee_ID AND a.Att_Date=CAST(@dt AS DATE))
        `, { dt:att_date });
        let cnt = 0;
        for (const e of emps.recordset) {
            await query(`
                INSERT INTO Employee_Attendance (Employee_ID,Att_Date,Status,Shift_ID,Marked_By)
                VALUES (@eid, CAST(@dt AS DATE), 'Present', @sid, @by)
            `, { eid:e.Employee_ID, dt:att_date, sid:shift_id||null, by:req.session.user.id });
            cnt++;
        }
        req.flash('success', `✅ ${cnt} employees marked Present`);
    } catch(err) { req.flash('error', err.message); }
    res.redirect(`/attendance?date=${att_date}`);
});

// ─── ROSTER SAVE ──────────────────────────────────────────
router.post('/roster', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).redirect('/');
    const { employee_id, roster_date, shift_id, is_off_day, notes } = req.body;
    try {
        await query(`
            MERGE Roster AS tgt
            USING (SELECT @eid AS Employee_ID, CAST(@dt AS DATE) AS Roster_Date) AS src
            ON tgt.Employee_ID=src.Employee_ID AND tgt.Roster_Date=src.Roster_Date
            WHEN MATCHED THEN UPDATE SET Shift_ID=@sid, Is_Off_Day=@off, Notes=@notes, Assigned_By=@by
            WHEN NOT MATCHED THEN INSERT (Employee_ID,Roster_Date,Shift_ID,Is_Off_Day,Notes,Assigned_By)
            VALUES (@eid, CAST(@dt AS DATE), @sid, @off, @notes, @by);
        `, {
            eid:parseInt(employee_id), dt:roster_date,
            sid:shift_id||null, off:is_off_day?1:0,
            notes:(notes||'').trim(), by:req.session.user.id
        });
        req.flash('success','✅ Roster saved');
    } catch(err) { req.flash('error',err.message); }
    res.redirect(`/attendance?date=${roster_date}`);
});

// ─── MONTHLY REPORT ───────────────────────────────────────
router.get('/report', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).redirect('/');
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const [yr, mo] = month.split('-');
    try {
        const report = await query(`
            SELECT e.Employee_ID, e.Name, e.Role,
                   COUNT(CASE WHEN a.Status='Present'  THEN 1 END) AS Present_Days,
                   COUNT(CASE WHEN a.Status='Half Day' THEN 1 END) AS Half_Days,
                   COUNT(CASE WHEN a.Status='Absent'   THEN 1 END) AS Absent_Days,
                   COUNT(CASE WHEN a.Status='Off'      THEN 1 END) AS Off_Days,
                   COUNT(CASE WHEN a.Status='Late'     THEN 1 END) AS Late_Days,
                   ISNULL(SUM(a.Total_Hours),0) AS Total_Hours
            FROM Employees e
            LEFT JOIN Employee_Attendance a ON a.Employee_ID=e.Employee_ID
                AND YEAR(a.Att_Date)=@yr AND MONTH(a.Att_Date)=@mo
            WHERE e.Is_Active=1 AND e.Role IN ('Operator','Admin')
            GROUP BY e.Employee_ID, e.Name, e.Role
            ORDER BY e.Role, e.Name
        `, { yr:parseInt(yr), mo:parseInt(mo) });
        res.render('owner/attendance-report', { title:'Attendance Report', month, report:report.recordset });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── BULK MARK ALL PRESENT ───────────────────────────────
router.post('/bulk-present', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).redirect('/');
    const { att_date, employee_ids } = req.body;
    const ids = Array.isArray(employee_ids) ? employee_ids : (employee_ids ? [employee_ids] : []);
    try {
        for (const eid of ids) {
            await query(`
                MERGE Employee_Attendance AS target
                USING (SELECT @eid AS Employee_ID, CAST(@dt AS DATE) AS Att_Date) AS src
                ON target.Employee_ID=src.Employee_ID AND target.Att_Date=src.Att_Date
                WHEN NOT MATCHED THEN INSERT (Employee_ID, Att_Date, Status) VALUES (@eid, CAST(@dt AS DATE), 'Present');
            `, { eid:parseInt(eid), dt:att_date });
        }
        req.flash('success', `✅ ${ids.length} employees marked Present`);
    } catch(err) { req.flash('error', err.message); }
    res.redirect(`/attendance?date=${att_date}`);
});

// ─── BULK MARK OFF / ABSENT ───────────────────────────────
router.post('/bulk-off', isLoggedIn, async (req, res) => {
    if (!['Owner','Admin'].includes(req.session.user.role)) return res.status(403).redirect('/');
    const { att_date, employee_ids, mark_status } = req.body;
    const ids = Array.isArray(employee_ids) ? employee_ids : (employee_ids ? [employee_ids] : []);
    const st = ['Absent','Off','Holiday'].includes(mark_status) ? mark_status : 'Absent';
    try {
        for (const eid of ids) {
            await query(`
                MERGE Employee_Attendance AS target
                USING (SELECT @eid AS Employee_ID, CAST(@dt AS DATE) AS Att_Date) AS src
                ON target.Employee_ID=src.Employee_ID AND target.Att_Date=src.Att_Date
                WHEN MATCHED THEN UPDATE SET Status=@st, Marked_By=@by
                WHEN NOT MATCHED THEN INSERT (Employee_ID, Att_Date, Status, Marked_By)
                    VALUES (@eid, CAST(@dt AS DATE), @st, @by);
            `, { eid:parseInt(eid), dt:att_date, st, by:req.session.user.id });
        }
        req.flash('success', `✅ ${ids.length} employees marked ${st}`);
    } catch(err) { req.flash('error', err.message); }
    res.redirect(`/attendance?date=${att_date}`);
});

module.exports = router;
