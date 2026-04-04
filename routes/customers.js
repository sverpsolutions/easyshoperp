// routes/customers.js
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { isLoggedIn, isOwner } = require('../middleware/auth');

router.use(isLoggedIn, isOwner);

// ─── LIST ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const search = (req.query.search || '').trim();
    try {
        const customers = await query(`
            SELECT c.*,
                   COUNT(DISTINCT j.Job_ID) AS Total_Jobs,
                   ISNULL(SUM(CASE WHEN j.Status NOT IN ('Cancelled') THEN j.Required_Qty END),0) AS Total_Qty,
                   ISNULL(SUM(b.Net_Amount),0) AS Total_Billed,
                   ISNULL(SUM(b.Amount_Paid),0) AS Total_Paid
            FROM Customer_Master c
            LEFT JOIN Jobs j ON j.Customer_ID = c.Customer_ID
            LEFT JOIN Bill_Register b ON b.Customer_ID = c.Customer_ID AND b.Payment_Status != 'Cancelled'
            WHERE c.Is_Active = 1
            ${search ? "AND (c.Customer_Name LIKE @s OR c.Mobile LIKE @s OR c.GST_No LIKE @s)" : ''}
            GROUP BY c.Customer_ID,c.Customer_Name,c.Mobile,c.Alt_Mobile,c.Address,c.City,
                     c.GST_No,c.Category,c.Credit_Limit,c.Opening_Balance,c.Current_Balance,
                     c.Notes,c.Is_Active,c.Created_Date,
                     c.Portal_Username,c.Portal_Password,c.Portal_Active,c.Email,c.Logo_Path
            ORDER BY c.Customer_Name
        `, search ? { s: `%${search}%` } : {});
        res.render('owner/customers', { title:'Customer Master', customers:customers.recordset, search });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── CREATE ───────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { customer_name, mobile, alt_mobile, address, city, gst_no, category, credit_limit, opening_balance, notes } = req.body;
    if (!customer_name || !mobile) { req.flash('error','Name and Mobile are required'); return res.redirect('/owner/customers'); }
    try {
        const ob = parseFloat(opening_balance) || 0;
        await query(`
            INSERT INTO Customer_Master (Customer_Name,Mobile,Alt_Mobile,Address,City,GST_No,Category,Credit_Limit,Opening_Balance,Current_Balance,Notes)
            VALUES (@cn,@mob,@alt,@addr,@city,@gst,@cat,@cl,@ob,@ob,@notes)
        `, {
            cn:customer_name.trim(), mob:mobile.trim(),
            alt:(alt_mobile||'').trim(), addr:(address||'').trim(),
            city:(city||'').trim(), gst:(gst_no||'').trim(),
            cat:category||'Regular', cl:parseFloat(credit_limit)||0,
            ob, notes:(notes||'').trim()
        });
        req.flash('success', `✅ Customer "${customer_name}" added`);
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/owner/customers');
});

// ─── VIEW / LEDGER ────────────────────────────────────────




// ─── ORDER REQUESTS — Owner View All ─────────────────────────
// NOTE: Must be defined BEFORE /:id route to avoid Express matching 'order-requests' as an ID
router.get('/order-requests', async (req, res) => {
    try {
        const r = await query(`
            SELECT o.*, c.Customer_Name, c.Mobile
            FROM Order_Requests o
            JOIN Customer_Master c ON c.Customer_ID = o.Customer_ID
            ORDER BY
                CASE o.Status WHEN 'Pending' THEN 1 WHEN 'Reviewing' THEN 2 ELSE 3 END,
                o.Request_Date DESC
        `);
        res.render('owner/order-requests', { title: 'Customer Order Requests', orders: r.recordset });
    } catch(err) { res.render('error', { title:'Error', message: err.message }); }
});

// ─── APPROVE / REJECT / REVIEW ORDER REQUEST ─────────────────
router.post('/order-requests/:id/action', async (req, res) => {
    const { action, owner_notes } = req.body;
    const rid = req.params.id;
    if (!['Reviewing','Approved','Rejected'].includes(action)) return res.redirect('/owner/customers/order-requests');
    try {
        await query(`
            UPDATE Order_Requests SET Status=@st, Owner_Notes=@notes,
                Reviewed_By=@by, Reviewed_At=GETDATE()
            WHERE Request_ID=@id
        `, { st: action, notes: owner_notes||'', by: req.session.user.id, id: rid });

        if (action === 'Approved') {
            const orR = await query(`
                SELECT o.*, c.Customer_Name, c.Mobile
                FROM Order_Requests o JOIN Customer_Master c ON c.Customer_ID=o.Customer_ID
                WHERE o.Request_ID=@id
            `, { id: rid });
            const o = orR.recordset[0];
            if (o) {
                const yr = new Date().getFullYear();
                const seqR = await query(
                    "SELECT ISNULL(MAX(CAST(SUBSTRING(Job_Number,8,10) AS INT)),0) AS MaxSeq " +
                    "FROM Jobs WHERE Job_Number LIKE @pat AND ISNUMERIC(SUBSTRING(Job_Number,8,10))=1",
                    { pat: 'J-' + yr + '-%' }
                );
                const jobNum = 'J-' + yr + '-' + String((parseInt(seqR.recordset[0]?.MaxSeq)||0)+1).padStart(4,'0');
                const today  = new Date().toISOString().split('T')[0];
                const jobR   = await query(
                    "INSERT INTO Jobs (Job_Number,Customer_Name,Mobile_No,Customer_ID,Label,Label_Type,Size," +
                    "Required_Qty,Paper,Core,Packing,Notes,Order_Date,Delivery_Date,Status) " +
                    "OUTPUT INSERTED.Job_ID VALUES " +
                    "(@jnum,@cn,@mob,@cid,@lbl,@lt,@sz,@qty,@pap,@cor,@pack,@notes,@od,@dd,'Pending')",
                    { jnum:jobNum, cn:o.Customer_Name, mob:o.Mobile||'', cid:o.Customer_ID,
                      lbl:o.Label_Name||'', lt:o.Label_Type||'Plain', sz:o.Size||'',
                      qty:o.Quantity, pap:o.Paper||'', cor:o.Core||'', pack:o.Packing||'',
                      notes:o.Notes||'', od:today, dd:o.Required_By||null }
                );
                const newJobId = jobR.recordset[0]?.Job_ID;
                if (newJobId) await query('UPDATE Order_Requests SET Job_ID=@jid WHERE Request_ID=@rid', { jid:newJobId, rid });
                req.flash('success', '✅ Order approved & Job ' + jobNum + ' created automatically');
            }
        } else {
            req.flash('success', '✅ Order marked as ' + action);
        }
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/owner/customers/order-requests');
});

router.get('/:id', async (req, res) => {
    try {
        const [cust, jobs, bills, payments] = await Promise.all([
            query(`SELECT * FROM Customer_Master WHERE Customer_ID=@id`, { id:req.params.id }),
            query(`SELECT j.*, ISNULL(m.Machine_Name,'—') AS Machine_Name, ISNULL(e.Name,'—') AS Operator_Name
                   FROM Jobs j LEFT JOIN Machines m ON m.Machine_ID=j.Assigned_Machine_ID
                   LEFT JOIN Employees e ON e.Employee_ID=j.Assigned_Operator_ID
                   WHERE j.Customer_ID=@id ORDER BY j.Job_ID DESC`, { id:req.params.id }),
            query(`SELECT * FROM Bill_Register WHERE Customer_ID=@id ORDER BY Bill_Date DESC`, { id:req.params.id }),
            query(`SELECT cp.*, ISNULL(e.Name,'—') AS Entered_By_Name
                   FROM Customer_Payments cp LEFT JOIN Employees e ON e.Employee_ID=cp.Entered_By
                   WHERE cp.Customer_ID=@id ORDER BY cp.Payment_Date DESC, cp.Payment_ID DESC`, { id:req.params.id })
        ]);
        if (!cust.recordset[0]) { req.flash('error','Customer not found'); return res.redirect('/owner/customers'); }
        res.render('owner/customer-detail', {
            title:`${cust.recordset[0].Customer_Name} — Ledger`,
            customer:cust.recordset[0], jobs:jobs.recordset,
            bills:bills.recordset, payments:payments.recordset
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── UPDATE ───────────────────────────────────────────────
router.post('/:id/update', async (req, res) => {
    const { customer_name, mobile, alt_mobile, address, city, gst_no, category, credit_limit, notes } = req.body;
    try {
        await query(`UPDATE Customer_Master SET Customer_Name=@cn,Mobile=@mob,Alt_Mobile=@alt,Address=@addr,
                     City=@city,GST_No=@gst,Category=@cat,Credit_Limit=@cl,Notes=@notes WHERE Customer_ID=@id`,
            { cn:customer_name.trim(),mob:mobile.trim(),alt:(alt_mobile||'').trim(),
              addr:(address||'').trim(),city:(city||'').trim(),gst:(gst_no||'').trim(),
              cat:category||'Regular',cl:parseFloat(credit_limit)||0,
              notes:(notes||'').trim(),id:req.params.id });
        req.flash('success','✅ Customer updated');
    } catch(err) { req.flash('error',err.message); }
    res.redirect(`/owner/customers/${req.params.id}`);
});

// ─── ADD PAYMENT ──────────────────────────────────────────
router.post('/:id/payment', async (req, res) => {
    const { payment_date, payment_type, amount, payment_mode, cheque_no, reference_no, narration, job_id, bill_id } = req.body;
    try {
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) throw new Error('Invalid amount');

        // Get current balance
        const cur = await query(`SELECT Current_Balance FROM Customer_Master WHERE Customer_ID=@id`, { id:req.params.id });
        const prevBal = parseFloat(cur.recordset[0].Current_Balance) || 0;
        // Receipt = customer pays us (reduces balance), Payment = we pay customer (rare), Adjustment, Opening
        const newBal = payment_type === 'Receipt'
            ? prevBal - amt
            : payment_type === 'Payment' ? prevBal + amt : prevBal;

        await query(`
            INSERT INTO Customer_Payments (Customer_ID, Customer_Name, Job_ID, Bill_ID, Payment_Date,
                Payment_Type, Amount, Payment_Mode, Cheque_No, Reference_No, Narration, Balance_After, Entered_By)
            SELECT @cid, Customer_Name, @jid, @bid, @pd, @pt, @amt, @pm, @cno, @ref, @nar, @bal, @eby
            FROM Customer_Master WHERE Customer_ID=@cid
        `, {
            cid:parseInt(req.params.id), jid:job_id||null, bid:bill_id||null,
            pd:payment_date, pt:payment_type, amt, pm:payment_mode||'Cash',
            cno:cheque_no||null, ref:reference_no||null, nar:narration||null,
            bal:newBal, eby:req.session.user.id
        });
        // Update customer balance
        await query(`UPDATE Customer_Master SET Current_Balance=@bal WHERE Customer_ID=@id`, { bal:newBal, id:req.params.id });
        // Update bill if linked
        if (bill_id && payment_type === 'Receipt') {
            await query(`
                UPDATE Bill_Register SET
                    Amount_Paid = Amount_Paid + @amt,
                    Balance_Due = Net_Amount - (Amount_Paid + @amt),
                    Payment_Status = CASE
                        WHEN (Amount_Paid + @amt) >= Net_Amount THEN 'Paid'
                        WHEN (Amount_Paid + @amt) > 0 THEN 'Partial'
                        ELSE 'Unpaid' END,
                    Updated_Date = GETDATE()
                WHERE Bill_ID = @bid
            `, { amt, bid:parseInt(bill_id) });
        }
        req.flash('success', `✅ ₹${amt.toLocaleString('en-IN')} ${payment_type} recorded`);
    } catch(err) { req.flash('error', err.message); }
    res.redirect(`/owner/customers/${req.params.id}`);
});

// ─── DEACTIVATE ───────────────────────────────────────────
router.post('/:id/deactivate', async (req, res) => {
    try {
        await query(`UPDATE Customer_Master SET Is_Active=0 WHERE Customer_ID=@id`, { id:req.params.id });
        req.flash('success','Customer deactivated');
    } catch(err) { req.flash('error',err.message); }
    res.redirect('/owner/customers');
});

module.exports = router;

// ─── ENABLE/DISABLE PORTAL ACCESS ────────────────────────────
router.post('/:id/portal-setup', isLoggedIn, isOwner, async (req, res) => {
    const { portal_username, portal_password, portal_active } = req.body;
    const cid = req.params.id;
    try {
        let updateFields = 'Portal_Username=@u, Portal_Active=@a';
        const params = { u: portal_username.trim(), a: portal_active ? 1 : 0, id: cid };
        if (portal_password && portal_password.trim().length >= 6) {
            const bcrypt = require('bcryptjs');
            params.p = await bcrypt.hash(portal_password.trim(), 10);
            updateFields += ', Portal_Password=@p';
        }
        await query('UPDATE Customer_Master SET ' + updateFields + ' WHERE Customer_ID=@id', params);
        req.flash('success', portal_active ? '✅ Portal access enabled' : '🔒 Portal access disabled');
    } catch(err) { req.flash('error', err.message); }
    res.redirect('/owner/customers/' + cid);
});

module.exports = router;
