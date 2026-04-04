// routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

router.use(isLoggedIn, isAdmin);

// GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const [employees, machines, jobs] = await Promise.all([
            query(`SELECT * FROM Employees ORDER BY Role, Name`),
            query(`SELECT * FROM Machines ORDER BY Machine_ID`),
            query(`SELECT j.*, m.Machine_Name, e.Name AS Op_Name FROM Jobs j LEFT JOIN Machines m ON m.Machine_ID=j.Assigned_Machine_ID LEFT JOIN Employees e ON e.Employee_ID=j.Assigned_Operator_ID ORDER BY j.Created_Date DESC`)
        ]);
        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            employees: employees.recordset,
            machines: machines.recordset,
            jobs: jobs.recordset
        });
    } catch (err) {
        res.render('error', { title: 'Error', message: err.message });
    }
});

// POST /admin/employee/create
router.post('/employee/create', async (req, res) => {
    const { name, role, mobile, username, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await query(`
            INSERT INTO Employees (Name, Role, Mobile, Username, Password_Hash)
            VALUES (@n, @r, @m, @u, @h)
        `, { n: name, r: role, m: mobile, u: username, h: hash });
        req.flash('success', 'Employee created');
    } catch (err) {
        req.flash('error', err.message);
    }
    res.redirect('/admin/dashboard');
});

// POST /admin/employee/:id/toggle
router.post('/employee/:id/toggle', async (req, res) => {
    await query(`UPDATE Employees SET Is_Active = 1 - Is_Active WHERE Employee_ID = @id`, { id: req.params.id });
    res.redirect('/admin/dashboard');
});

// POST /admin/machine/:id/status
router.post('/machine/:id/status', async (req, res) => {
    const { status } = req.body;
    await query(`UPDATE Machines SET Status=@s WHERE Machine_ID=@id`, { s: status, id: req.params.id });
    req.flash('success', 'Machine status updated');
    res.redirect('/admin/dashboard');
});

// GET /admin/audit
router.get('/audit', async (req, res) => {
    const result = await query(`
        SELECT al.*, e.Name AS Employee_Name
        FROM Audit_Log al LEFT JOIN Employees e ON e.Employee_ID = al.Employee_ID
        ORDER BY al.Log_Time DESC OFFSET 0 ROWS FETCH NEXT 200 ROWS ONLY
    `);
    res.render('admin/audit', { title: 'Audit Log', logs: result.recordset });
});

module.exports = router;
