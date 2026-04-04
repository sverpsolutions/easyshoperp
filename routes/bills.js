// routes/bills.js — Bill Register
const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { isLoggedIn, isOwner } = require('../middleware/auth');

router.use(isLoggedIn, isOwner);

// ─── LIST ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
    const { status, search, from, to } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const f = from || new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const t = to   || today;
    try {
        // where with alias 'b' for main query (has JOIN)
        let where = `WHERE b.Bill_Date BETWEEN @f AND @t`;
        // whereSum without alias for summary query (no JOIN)
        let whereSum = `WHERE Bill_Date BETWEEN @f AND @t`;
        const params = { f, t };
        if (status) {
            where    += ` AND b.Payment_Status=@st`;
            whereSum += ` AND Payment_Status=@st`;
            params.st = status;
        }
        if (search) {
            where    += ` AND (b.Customer_Name LIKE @s OR b.Bill_Number LIKE @s)`;
            whereSum += ` AND (Customer_Name LIKE @s OR Bill_Number LIKE @s)`;
            params.s  = `%${search}%`;
        }

        const [bills, summary] = await Promise.all([
            query(`SELECT b.*, ISNULL(j.Job_Number,'—') AS Job_Number
                   FROM Bill_Register b LEFT JOIN Jobs j ON j.Job_ID=b.Job_ID
                   ${where} ORDER BY b.Bill_Date DESC, b.Bill_ID DESC`, params),
            query(`SELECT
                    COUNT(*) AS Total_Bills,
                    SUM(Net_Amount) AS Total_Amount,
                    SUM(Amount_Paid) AS Total_Paid,
                    SUM(Balance_Due) AS Total_Due,
                    SUM(CASE WHEN Payment_Status='Unpaid' THEN 1 ELSE 0 END) AS Unpaid_Count,
                    SUM(CASE WHEN Payment_Status='Partial' THEN 1 ELSE 0 END) AS Partial_Count
                   FROM Bill_Register ${whereSum}`, params)
        ]);
        const customers = await query(`SELECT Customer_ID, Customer_Name FROM Customer_Master WHERE Is_Active=1 ORDER BY Customer_Name`);
        const jobs = await query(`SELECT Job_ID, Job_Number, Customer_Name FROM Jobs WHERE Bill_ID IS NULL AND Status IN ('Completed','Dispatched') ORDER BY Job_ID DESC`);
        res.render('owner/bills', {
            title:'Bill Register', bills:bills.recordset,
            summary:summary.recordset[0], customers:customers.recordset,
            jobs:jobs.recordset, status:status||'', search:search||'', from:f, to:t
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── CREATE BILL ──────────────────────────────────────────
router.post('/', async (req, res) => {
    const { bill_number, bill_date, customer_id, customer_name, mobile,
            gross_amount, discount_amt, tax_amount, net_amount,
            job_id, external_ref, notes } = req.body;
    if (!bill_number || !customer_name || !net_amount) {
        req.flash('error','Bill Number, Customer and Amount are required');
        return res.redirect('/owner/bills');
    }
    try {
        const net = parseFloat(net_amount);
        const r = await query(`
            INSERT INTO Bill_Register (Bill_Number,Bill_Date,Customer_ID,Customer_Name,Mobile,
                Gross_Amount,Discount_Amt,Tax_Amount,Net_Amount,Amount_Paid,Balance_Due,
                Payment_Status,Job_ID,External_Ref,Notes,Created_By)
            OUTPUT INSERTED.Bill_ID
            VALUES (@bn,@bd,@cid,@cn,@mob,@ga,@da,@ta,@na,0,@na,'Unpaid',@jid,@eref,@notes,@by)
        `, {
            bn:bill_number.trim(), bd:bill_date||new Date().toISOString().split('T')[0],
            cid:customer_id||null, cn:customer_name.trim(), mob:(mobile||'').trim(),
            ga:parseFloat(gross_amount)||net, da:parseFloat(discount_amt)||0,
            ta:parseFloat(tax_amount)||0, na:net,
            jid:job_id||null, eref:(external_ref||'').trim(),
            notes:(notes||'').trim(), by:req.session.user.id
        });
        const billId = r.recordset[0].Bill_ID;
        // Link job
        if (job_id) {
            await query(`UPDATE Jobs SET Bill_ID=@bid, Bill_Status='Billed' WHERE Job_ID=@jid`,
                { bid:billId, jid:parseInt(job_id) });
        }
        // Update customer balance if linked
        if (customer_id) {
            await query(`UPDATE Customer_Master SET Current_Balance=Current_Balance+@na WHERE Customer_ID=@cid`,
                { na:net, cid:parseInt(customer_id) });
        }
        req.flash('success', `✅ Bill ${bill_number} created`);
    } catch(err) {
        req.flash('error', err.message.includes('Unique') ? 'Bill number already exists' : err.message);
    }
    res.redirect('/owner/bills');
});

// ─── VIEW BILL ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const [bill, payments, items] = await Promise.all([
            query(`SELECT b.*, ISNULL(j.Job_Number,'—') AS Job_Number, ISNULL(e.Name,'—') AS Created_By_Name
                   FROM Bill_Register b LEFT JOIN Jobs j ON j.Job_ID=b.Job_ID
                   LEFT JOIN Employees e ON e.Employee_ID=b.Created_By
                   WHERE b.Bill_ID=@id`, { id:req.params.id }),
            query(`SELECT cp.*, ISNULL(e.Name,'—') AS Entered_By_Name
                   FROM Customer_Payments cp LEFT JOIN Employees e ON e.Employee_ID=cp.Entered_By
                   WHERE cp.Bill_ID=@id ORDER BY cp.Payment_Date DESC`, { id:req.params.id }),
            query(`SELECT * FROM Bill_Items WHERE Bill_ID=@id ORDER BY Item_ID`, { id:req.params.id })
        ]);
        if (!bill.recordset[0]) { req.flash('error','Bill not found'); return res.redirect('/owner/bills'); }
        res.render('owner/bill-detail', {
            title:`Bill ${bill.recordset[0].Bill_Number}`,
            bill:bill.recordset[0], payments:payments.recordset, items:items.recordset
        });
    } catch(err) { res.render('error', { title:'Error', message:err.message }); }
});

// ─── QUICK PAYMENT ON BILL ────────────────────────────────
router.post('/:id/pay', async (req, res) => {
    const { amount, payment_mode, cheque_no, reference_no, narration, payment_date } = req.body;
    try {
        const billR = await query(`SELECT * FROM Bill_Register WHERE Bill_ID=@id`, { id:req.params.id });
        const bill  = billR.recordset[0];
        if (!bill) throw new Error('Bill not found');
        const amt = parseFloat(amount);
        if (!amt || amt <= 0) throw new Error('Invalid amount');
        const newPaid = parseFloat(bill.Amount_Paid) + amt;
        const newBal  = parseFloat(bill.Net_Amount) - newPaid;
        const newSt   = newBal <= 0 ? 'Paid' : 'Partial';
        await query(`UPDATE Bill_Register SET Amount_Paid=@np, Balance_Due=@nb, Payment_Status=@st, Updated_Date=GETDATE() WHERE Bill_ID=@id`,
            { np:newPaid, nb:Math.max(0,newBal), st:newSt, id:req.params.id });
        // Insert into customer payments
        if (bill.Customer_ID) {
            const curBal = await query(`SELECT Current_Balance FROM Customer_Master WHERE Customer_ID=@cid`, { cid:bill.Customer_ID });
            const prevCustBal = parseFloat(curBal.recordset[0]?.Current_Balance) || 0;
            const newCustBal  = prevCustBal - amt;
            await query(`INSERT INTO Customer_Payments
                (Customer_ID,Customer_Name,Bill_ID,Payment_Date,Payment_Type,Amount,Payment_Mode,Cheque_No,Reference_No,Narration,Balance_After,Entered_By)
                VALUES(@cid,@cn,@bid,@pd,'Receipt',@amt,@pm,@cno,@ref,@nar,@bal,@by)`,
                { cid:bill.Customer_ID, cn:bill.Customer_Name, bid:req.params.id,
                  pd:payment_date||new Date().toISOString().split('T')[0],
                  amt, pm:payment_mode||'Cash', cno:cheque_no||null, ref:reference_no||null,
                  nar:narration||null, bal:newCustBal, by:req.session.user.id });
            await query(`UPDATE Customer_Master SET Current_Balance=@b WHERE Customer_ID=@cid`, { b:newCustBal, cid:bill.Customer_ID });
        }
        // Update job bill status
        if (bill.Job_ID) {
            await query(`UPDATE Jobs SET Bill_Status=@st WHERE Job_ID=@jid`, { st:newSt==='Paid'?'Paid':'Partial', jid:bill.Job_ID });
        }
        req.flash('success', `✅ ₹${amt.toLocaleString('en-IN')} payment recorded. ${newSt==='Paid'?'Bill FULLY PAID ✅':'Balance: ₹'+Math.max(0,newBal).toLocaleString('en-IN')}`);
    } catch(err) { req.flash('error',err.message); }
    res.redirect(`/owner/bills/${req.params.id}`);
});

// ─── CANCEL BILL ──────────────────────────────────────────
router.post('/:id/cancel', async (req, res) => {
    try {
        const billR = await query(`SELECT * FROM Bill_Register WHERE Bill_ID=@id`, { id:req.params.id });
        const bill  = billR.recordset[0];
        await query(`UPDATE Bill_Register SET Payment_Status='Cancelled', Updated_Date=GETDATE() WHERE Bill_ID=@id`, { id:req.params.id });
        if (bill?.Customer_ID && parseFloat(bill.Balance_Due) > 0) {
            await query(`UPDATE Customer_Master SET Current_Balance=Current_Balance-@bd WHERE Customer_ID=@cid`,
                { bd:parseFloat(bill.Balance_Due), cid:bill.Customer_ID });
        }
        if (bill?.Job_ID) await query(`UPDATE Jobs SET Bill_Status='Not Billed', Bill_ID=NULL WHERE Job_ID=@jid`, { jid:bill.Job_ID });
        req.flash('success','Bill cancelled');
    } catch(err) { req.flash('error',err.message); }
    res.redirect('/owner/bills');
});

module.exports = router;
