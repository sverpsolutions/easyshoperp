// routes/customer-portal.js — Customer Mobile Portal
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const { query } = require('../config/database');

// ── Auth middleware ───────────────────────────────────────────
function isCustomer(req, res, next) {
    if (req.session.customer) return next();
    res.redirect('/portal/login');
}

// ── LOGIN ─────────────────────────────────────────────────────
router.get('/login', (req, res) => {
    if (req.session.customer) return res.redirect('/portal/dashboard');
    res.render('portal/login', { title: 'Customer Login', error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const r = await query(`
            SELECT Customer_ID, Customer_Name, Mobile, Email,
                   Portal_Username, Portal_Password, Portal_Active,
                   Current_Balance, City, Logo_Path
            FROM Customer_Master
            WHERE Portal_Username = @u AND Portal_Active = 1 AND Is_Active = 1
        `, { u: username.trim() });

        const cust = r.recordset[0];
        if (!cust) return res.render('portal/login', { title:'Customer Login', error:'Invalid username or password' });

        const match = await bcrypt.compare(password, cust.Portal_Password || '');
        if (!match) return res.render('portal/login', { title:'Customer Login', error:'Invalid username or password' });

        req.session.customer = {
            id: cust.Customer_ID, name: cust.Customer_Name,
            mobile: cust.Mobile, username: cust.Portal_Username,
            logoPath: cust.Logo_Path
        };
        res.redirect('/portal/dashboard');
    } catch(err) {
        res.render('portal/login', { title:'Customer Login', error:'Login error. Please try again.' });
    }
});

router.get('/logout', (req, res) => {
    req.session.customer = null;
    res.redirect('/portal/login');
});

// ── DASHBOARD ─────────────────────────────────────────────────
router.get('/dashboard', isCustomer, async (req, res) => {
    const cid = req.session.customer.id;
    try {
        const [custR, ordersR, jobsR, billsR] = await Promise.all([
            query(`SELECT * FROM Customer_Master WHERE Customer_ID=@id`, { id: cid }),
            query(`
                SELECT TOP 5 Request_ID, Request_Date, Label_Name, Quantity,
                             Status, Required_By, Owner_Notes
                FROM Order_Requests WHERE Customer_ID=@id
                ORDER BY Request_Date DESC
            `, { id: cid }),
            query(`
                SELECT TOP 5 Job_ID, Job_Number, Label, Required_Qty,
                             Produced_Qty, Status, Order_Date, Delivery_Date
                FROM Jobs WHERE Customer_ID=@id
                ORDER BY Job_ID DESC
            `, { id: cid }),
            query(`
                SELECT TOP 3 Bill_ID, Bill_Number, Bill_Date, Net_Amount,
                             Amount_Paid, Balance_Due, Payment_Status
                FROM Bill_Register WHERE Customer_ID=@id
                ORDER BY Bill_Date DESC
            `, { id: cid })
        ]);

        const cust = custR.recordset[0];
        const stats = {
            pendingOrders: ordersR.recordset.filter(o => ['Pending','Reviewing'].includes(o.Status)).length,
            activeJobs:    jobsR.recordset.filter(j => ['Running','Assigned','Pending'].includes(j.Status)).length,
            unpaidBills:   billsR.recordset.filter(b => b.Payment_Status !== 'Paid').length,
            balance:       cust?.Current_Balance || 0
        };

        res.render('portal/dashboard', {
            title: 'My Dashboard', customer: cust,
            recentOrders: ordersR.recordset,
            recentJobs: jobsR.recordset,
            recentBills: billsR.recordset, stats,
            session: req.session
        });
    } catch(err) { res.render('error', { title:'Error', message: err.message }); }
});

// ── NEW ORDER REQUEST ─────────────────────────────────────────
router.get('/order/new', isCustomer, async (req, res) => {
    res.render('portal/order-new', { title: 'Place New Order', error: null, session: req.session });
});

const { photoUpload } = require('../utils/upload');
router.post('/order/new', isCustomer, photoUpload.single('artwork'), async (req, res) => {
    const cid = req.session.customer.id;
    const {
        label_name, label_type, size, quantity, paper,
        core, packing, notes, required_by, delivery_address
    } = req.body;

    if (!quantity || parseInt(quantity) <= 0) {
        return res.render('portal/order-new', {
            title: 'Place New Order', error: 'Quantity is required', session: req.session
        });
    }
    try {
        const artworkPath = req.file ? '/uploads/artwork/' + req.file.filename : null;
        await query(`
            INSERT INTO Order_Requests (
                Customer_ID, Label_Name, Label_Type, Size, Quantity,
                Paper, Core, Packing, Notes, Artwork_Path,
                Required_By, Delivery_Address, Status
            ) VALUES (
                @cid, @ln, @lt, @sz, @qty,
                @pap, @cor, @pack, @notes, @art,
                @rb, @da, 'Pending'
            )
        `, {
            cid, ln: label_name||'', lt: label_type||'Plain',
            sz: size||'', qty: parseInt(quantity),
            pap: paper||'', cor: core||'', pack: packing||'',
            notes: notes||'', art: artworkPath,
            rb: required_by||null, da: delivery_address||''
        });

        // Notify owner via flash (they'll see it on dashboard)
        res.redirect('/portal/orders?success=1');
    } catch(err) {
        res.render('portal/order-new', { title:'Place New Order', error: err.message, session: req.session });
    }
});

// ── MY ORDERS ─────────────────────────────────────────────────
router.get('/orders', isCustomer, async (req, res) => {
    const cid = req.session.customer.id;
    try {
        const r = await query(`
            SELECT o.*, j.Job_Number, j.Produced_Qty, j.Status AS Job_Status
            FROM Order_Requests o
            LEFT JOIN Jobs j ON j.Job_ID = o.Job_ID
            WHERE o.Customer_ID = @id
            ORDER BY o.Request_Date DESC
        `, { id: cid });
        res.render('portal/orders', {
            title: 'My Orders', orders: r.recordset,
            success: req.query.success, session: req.session
        });
    } catch(err) { res.render('error', { title:'Error', message: err.message }); }
});

// ── MY JOBS (Production Status) ───────────────────────────────
router.get('/jobs', isCustomer, async (req, res) => {
    const cid = req.session.customer.id;
    try {
        const r = await query(`
            SELECT Job_ID, Job_Number, Label, Label_Type, Size,
                   Required_Qty, Produced_Qty, Status,
                   CONVERT(NVARCHAR, Order_Date, 105) AS Order_Date,
                   CONVERT(NVARCHAR, ISNULL(Delivery_Date, Order_Date), 105) AS Delivery_Date,
                   Start_Time, End_Time,
                   CASE WHEN Required_Qty > 0
                        THEN CAST(ISNULL(Produced_Qty,0)*100.0/Required_Qty AS DECIMAL(5,1))
                        ELSE 0 END AS Progress
            FROM Jobs WHERE Customer_ID = @id
            ORDER BY Job_ID DESC
        `, { id: cid });
        res.render('portal/jobs', { title: 'My Jobs', jobs: r.recordset, session: req.session });
    } catch(err) { res.render('error', { title:'Error', message: err.message }); }
});

// ── MY BILLS ──────────────────────────────────────────────────
router.get('/bills', isCustomer, async (req, res) => {
    const cid = req.session.customer.id;
    try {
        const [billsR, custR] = await Promise.all([
            query(`
                SELECT b.*, j.Job_Number
                FROM Bill_Register b
                LEFT JOIN Jobs j ON j.Job_ID = b.Job_ID
                WHERE b.Customer_ID = @id
                ORDER BY b.Bill_Date DESC
            `, { id: cid }),
            query(`SELECT Customer_Name, Current_Balance, Credit_Limit FROM Customer_Master WHERE Customer_ID=@id`, { id: cid })
        ]);
        res.render('portal/bills', {
            title: 'My Bills', bills: billsR.recordset,
            customer: custR.recordset[0], session: req.session
        });
    } catch(err) { res.render('error', { title:'Error', message: err.message }); }
});

// ── MY PROFILE ────────────────────────────────────────────────
router.get('/profile', isCustomer, async (req, res) => {
    const cid = req.session.customer.id;
    try {
        const r = await query(`SELECT * FROM Customer_Master WHERE Customer_ID=@id`, { id: cid });
        res.render('portal/profile', {
            title: 'My Profile', customer: r.recordset[0],
            success: req.query.success, session: req.session
        });
    } catch(err) { res.render('error', { title:'Error', message: err.message }); }
});

router.post('/profile', isCustomer, async (req, res) => {
    const cid = req.session.customer.id;
    const { mobile, alt_mobile, email, address, city } = req.body;
    try {
        await query(`
            UPDATE Customer_Master SET
                Mobile=@mob, Alt_Mobile=@alt, Email=@email,
                Address=@addr, City=@city
            WHERE Customer_ID=@id
        `, { mob: mobile||'', alt: alt_mobile||'', email: email||'',
             addr: address||'', city: city||'', id: cid });
        res.redirect('/portal/profile?success=1');
    } catch(err) { res.redirect('/portal/profile'); }
});

router.post('/change-password', isCustomer, async (req, res) => {
    const cid = req.session.customer.id;
    const { current_password, new_password, confirm_password } = req.body;
    try {
        if (new_password !== confirm_password) {
            return res.redirect('/portal/profile?error=Passwords+do+not+match');
        }
        if (new_password.length < 6) {
            return res.redirect('/portal/profile?error=Password+must+be+at+least+6+characters');
        }
        const r = await query(`SELECT Portal_Password FROM Customer_Master WHERE Customer_ID=@id`, { id: cid });
        const match = await bcrypt.compare(current_password, r.recordset[0]?.Portal_Password || '');
        if (!match) return res.redirect('/portal/profile?error=Current+password+is+wrong');
        const hash = await bcrypt.hash(new_password, 10);
        await query(`UPDATE Customer_Master SET Portal_Password=@p WHERE Customer_ID=@id`, { p: hash, id: cid });
        res.redirect('/portal/profile?success=1');
    } catch(err) { res.redirect('/portal/profile'); }
});

module.exports = router;
