// app.js
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const socketIo   = require('socket.io');
const session    = require('express-session');
const flash      = require('connect-flash');
const methodOverride = require('method-override');
const path       = require('path');
const { getPool, query } = require('./config/database');

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server, { cors:{ origin:'*', methods:['GET','POST'] } });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(methodOverride('_method'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'mes-secret-key-2024',
    resave: false, saveUninitialized: false,
    cookie: { secure:false, maxAge:8*60*60*1000 }
}));
app.use(flash());
app.use((req, res, next) => {
    res.locals.user    = req.session.user || null;
    res.locals.success = req.flash('success');
    res.locals.error   = req.flash('error');
    next();
});

// ── License Check (runs on every request) ──────────────────
const licenseCheck = require('./middleware/licenseCheck');
app.use(licenseCheck);

// ── Routes ─────────────────────────────────────────────────
app.use('/',           require('./routes/license'));   // registration
app.use('/',           require('./routes/auth'));
app.use('/owner',      require('./routes/owner'));     // dashboard + jobs + settings + all reports
app.use('/owner/customers', require('./routes/customers'));  // includes order-requests
app.use('/owner/employees', require('./routes/employees'));
app.use('/owner/advances',  require('./routes/advances'));
app.use('/owner/bills',     require('./routes/bills'));
app.use('/advances',        require('./routes/advances'));  // shared: operator request + admin pay
app.use('/attendance',      require('./routes/attendance'));
app.use('/portal',          require('./routes/customer-portal'));  // customer mobile portal // attendance system
app.use('/operator',        require('./routes/operator'));
app.use('/admin',           require('./routes/admin'));
app.use('/api/telegram',    require('./routes/telegram_bot'));
app.use('/api',             require('./routes/api'));

// ── Socket.io ──────────────────────────────────────────────
io.on('connection', socket => { socket.on('disconnect', ()=>{}); });
setInterval(async () => {
    try {
        const r = await query(`
            SELECT m.Machine_ID, m.Machine_Name, m.Machine_Type, m.Status,
                   ISNULL(e.Name,'—') AS Operator_Name,
                   ISNULL(j.Job_Number,'') AS Job_Number,
                   ISNULL(j.Required_Qty,0) AS Required_Qty,
                   ISNULL(j.Produced_Qty,0) AS Produced_Qty,
                   ISNULL(DATEDIFF(MINUTE,j.Start_Time,GETDATE()),0) AS Run_Minutes
            FROM Machines m
            LEFT JOIN Employees e ON e.Employee_ID=m.Current_Operator_ID
            LEFT JOIN Jobs j      ON j.Job_ID=m.Current_Job_ID
        `);
        io.emit('machine-status-update', r.recordset);
    } catch(e) {}
}, 5000);

// ── 404 & Error ────────────────────────────────────────────
app.use((req, res) => res.status(404).render('404', { title:'Page Not Found' }));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { title:'Server Error', message:err.message });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    console.log(`\n🏭 Barcode Label MES v4.1 running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard : http://localhost:${PORT}/owner/dashboard`);
    console.log(`📋 Reports   : http://localhost:${PORT}/owner/reports`);
    console.log(`⚙️  Settings  : http://localhost:${PORT}/owner/settings`);
    console.log(`📈 Impr/Hr   : http://localhost:${PORT}/owner/reports/impressions`);
    try { await getPool(); console.log('✅ Database connected\n'); }
    catch(e) { console.warn('⚠️  DB not connected — check .env\n'); }
});

module.exports = { io };
