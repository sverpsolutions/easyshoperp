-- ============================================================
-- UPGRADE SCRIPT v4.0 — Customer Master, Employee Master,
-- Advance System, Customer Payments, Bill Register
-- Run on existing BarcodeMES database
-- ============================================================
USE BarcodeMES;
GO

-- ── 1. EXTEND EMPLOYEES TABLE ──────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Father_Name')
    ALTER TABLE Employees ADD Father_Name NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Address')
    ALTER TABLE Employees ADD Address NVARCHAR(300) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Aadhar_No')
    ALTER TABLE Employees ADD Aadhar_No NVARCHAR(20) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Join_Date')
    ALTER TABLE Employees ADD Join_Date DATE NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Monthly_Salary')
    ALTER TABLE Employees ADD Monthly_Salary DECIMAL(10,2) NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Bank_Name')
    ALTER TABLE Employees ADD Bank_Name NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Bank_Account')
    ALTER TABLE Employees ADD Bank_Account NVARCHAR(30) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Bank_IFSC')
    ALTER TABLE Employees ADD Bank_IFSC NVARCHAR(20) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Advance_Limit_Monthly')
    ALTER TABLE Employees ADD Advance_Limit_Monthly DECIMAL(10,2) NULL DEFAULT 5000;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Total_Advance_Balance')
    ALTER TABLE Employees ADD Total_Advance_Balance DECIMAL(10,2) NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Emergency_Contact')
    ALTER TABLE Employees ADD Emergency_Contact NVARCHAR(20) NULL;
PRINT 'Employees table extended ✓';
GO

-- ── 2. CUSTOMER MASTER ────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Customer_Master')
BEGIN
    CREATE TABLE Customer_Master (
        Customer_ID     INT IDENTITY(1,1) PRIMARY KEY,
        Customer_Name   NVARCHAR(100) NOT NULL,
        Mobile          NVARCHAR(20)  NOT NULL,
        Alt_Mobile      NVARCHAR(20)  NULL,
        Address         NVARCHAR(300) NULL,
        City            NVARCHAR(50)  NULL,
        GST_No          NVARCHAR(20)  NULL,
        Category        NVARCHAR(20)  DEFAULT 'Regular' CHECK (Category IN ('Regular','Wholesale','Retail','Corporate')),
        Credit_Limit    DECIMAL(12,2) DEFAULT 0,
        Opening_Balance DECIMAL(12,2) DEFAULT 0,  -- positive = customer owes us
        Current_Balance DECIMAL(12,2) DEFAULT 0,  -- running account balance
        Notes           NVARCHAR(500) NULL,
        Is_Active       BIT           DEFAULT 1,
        Created_Date    DATETIME      DEFAULT GETDATE()
    );
    PRINT 'Customer_Master created ✓';
END
GO

-- ── 3. EMPLOYEE ADVANCES ──────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Employee_Advances')
BEGIN
    CREATE TABLE Employee_Advances (
        Advance_ID      INT IDENTITY(1,1) PRIMARY KEY,
        Employee_ID     INT NOT NULL REFERENCES Employees(Employee_ID),
        Request_Date    DATETIME DEFAULT GETDATE(),
        Amount_Requested DECIMAL(10,2) NOT NULL,
        Reason          NVARCHAR(300) NULL,
        Status          NVARCHAR(20) DEFAULT 'Pending'
                        CHECK (Status IN ('Pending','Approved','Rejected','Paid')),
        -- Owner approval
        Approved_By     INT NULL REFERENCES Employees(Employee_ID),
        Approved_Date   DATETIME NULL,
        Amount_Approved DECIMAL(10,2) NULL,
        Reject_Reason   NVARCHAR(200) NULL,
        -- Admin cash given
        Paid_By         INT NULL REFERENCES Employees(Employee_ID),
        Paid_Date       DATETIME NULL,
        Amount_Paid     DECIMAL(10,2) NULL,
        Payment_Mode    NVARCHAR(20) DEFAULT 'Cash' CHECK (Payment_Mode IN ('Cash','Bank Transfer','UPI')),
        -- Deduction tracking
        Is_Deducted     BIT DEFAULT 0,
        Deduct_Month    NVARCHAR(7) NULL,  -- YYYY-MM
        Notes           NVARCHAR(300) NULL
    );
    PRINT 'Employee_Advances created ✓';
END
GO

-- ── 4. CUSTOMER PAYMENTS (Running Account) ───────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Customer_Payments')
BEGIN
    CREATE TABLE Customer_Payments (
        Payment_ID      INT IDENTITY(1,1) PRIMARY KEY,
        Customer_ID     INT NULL REFERENCES Customer_Master(Customer_ID),
        Customer_Name   NVARCHAR(100) NOT NULL,  -- fallback for non-master customers
        Job_ID          INT NULL REFERENCES Jobs(Job_ID),
        Bill_ID         INT NULL,                -- link to Bill_Register
        Payment_Date    DATE DEFAULT CAST(GETDATE() AS DATE),
        Payment_Type    NVARCHAR(20) NOT NULL
                        CHECK (Payment_Type IN ('Receipt','Payment','Adjustment','Opening')),
        Amount          DECIMAL(12,2) NOT NULL,
        Payment_Mode    NVARCHAR(20) DEFAULT 'Cash'
                        CHECK (Payment_Mode IN ('Cash','Cheque','UPI','NEFT','RTGS','Online')),
        Cheque_No       NVARCHAR(30) NULL,
        Reference_No    NVARCHAR(50) NULL,
        Narration       NVARCHAR(300) NULL,
        Balance_After   DECIMAL(12,2) NULL,  -- running balance after this entry
        Entered_By      INT NULL REFERENCES Employees(Employee_ID),
        Created_Date    DATETIME DEFAULT GETDATE()
    );
    PRINT 'Customer_Payments created ✓';
END
GO

-- ── 5. BILL REGISTER ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Bill_Register')
BEGIN
    CREATE TABLE Bill_Register (
        Bill_ID         INT IDENTITY(1,1) PRIMARY KEY,
        Bill_Number     NVARCHAR(50) NOT NULL UNIQUE,
        Bill_Date       DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        Customer_ID     INT NULL REFERENCES Customer_Master(Customer_ID),
        Customer_Name   NVARCHAR(100) NOT NULL,
        Mobile          NVARCHAR(20) NULL,
        -- Bill amounts
        Gross_Amount    DECIMAL(12,2) DEFAULT 0,
        Discount_Amt    DECIMAL(12,2) DEFAULT 0,
        Tax_Amount      DECIMAL(12,2) DEFAULT 0,
        Net_Amount      DECIMAL(12,2) NOT NULL,
        -- Payment status
        Amount_Paid     DECIMAL(12,2) DEFAULT 0,
        Balance_Due     DECIMAL(12,2) DEFAULT 0,
        Payment_Status  NVARCHAR(20) DEFAULT 'Unpaid'
                        CHECK (Payment_Status IN ('Unpaid','Partial','Paid','Cancelled')),
        -- Link to job
        Job_ID          INT NULL REFERENCES Jobs(Job_ID),
        -- External software reference
        External_Ref    NVARCHAR(100) NULL,  -- bill no from external software
        -- Details
        Items_JSON      NVARCHAR(MAX) NULL,  -- JSON of bill line items
        Notes           NVARCHAR(500) NULL,
        Created_By      INT NULL REFERENCES Employees(Employee_ID),
        Created_Date    DATETIME DEFAULT GETDATE(),
        Updated_Date    DATETIME NULL
    );
    PRINT 'Bill_Register created ✓';
END
GO

-- ── 6. BILL LINE ITEMS ────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Bill_Items')
BEGIN
    CREATE TABLE Bill_Items (
        Item_ID         INT IDENTITY(1,1) PRIMARY KEY,
        Bill_ID         INT NOT NULL REFERENCES Bill_Register(Bill_ID),
        Description     NVARCHAR(200) NOT NULL,
        Size            NVARCHAR(50)  NULL,
        Label_Type      NVARCHAR(20)  NULL,
        Qty             INT DEFAULT 1,
        Rate            DECIMAL(10,2) NOT NULL,
        Amount          DECIMAL(12,2) NOT NULL,
        Tax_Pct         DECIMAL(5,2)  DEFAULT 0,
        Tax_Amount      DECIMAL(10,2) DEFAULT 0
    );
    PRINT 'Bill_Items created ✓';
END
GO

-- ── 7. Add Bill_ID to Jobs table ─────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Bill_ID')
    ALTER TABLE Jobs ADD Bill_ID INT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Bill_Status')
    ALTER TABLE Jobs ADD Bill_Status NVARCHAR(20) NULL DEFAULT 'Not Billed'
        CHECK (Bill_Status IN ('Not Billed','Billed','Paid','Partial'));
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Customer_ID')
    ALTER TABLE Jobs ADD Customer_ID INT NULL REFERENCES Customer_Master(Customer_ID);
PRINT 'Jobs table extended ✓';
GO

-- ── 8. Hourly_Impressions (if not already done) ───────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Hourly_Impressions')
BEGIN
    CREATE TABLE Hourly_Impressions (
        Log_ID           INT IDENTITY(1,1) PRIMARY KEY,
        Machine_ID       INT NOT NULL REFERENCES Machines(Machine_ID),
        Operator_ID      INT NOT NULL REFERENCES Employees(Employee_ID),
        Job_ID           INT NULL REFERENCES Jobs(Job_ID),
        Log_Date         DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        Log_Hour         INT NOT NULL,
        Impressions_Count INT NOT NULL DEFAULT 0,
        Remarks          NVARCHAR(200) NULL,
        Created_At       DATETIME DEFAULT GETDATE()
    );
    PRINT 'Hourly_Impressions created ✓';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Machines') AND name='Target_Impressions_Per_Hour')
    ALTER TABLE Machines ADD Target_Impressions_Per_Hour INT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Machines') AND name='Machine_Category')
    ALTER TABLE Machines ADD Machine_Category NVARCHAR(30) NULL DEFAULT 'Flat Belt';
GO

PRINT '';
PRINT '✅ BarcodeMES v4.0 upgrade complete!';
PRINT '   New features: Customer Master, Employee Master,';
PRINT '   Employee Advances, Customer Payments, Bill Register';
GO

-- ============================================================
-- v4.1 Additions: Photo, Documents, Attendance
-- ============================================================

-- Photo & Documents on Employee
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Photo_Path')
    ALTER TABLE Employees ADD Photo_Path NVARCHAR(300) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Resume_Path')
    ALTER TABLE Employees ADD Resume_Path NVARCHAR(300) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Employees') AND name='Aadhar_Path')
    ALTER TABLE Employees ADD Aadhar_Path NVARCHAR(300) NULL;
PRINT 'Employee file columns added ✓';
GO

-- Attendance Table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Employee_Attendance')
BEGIN
    CREATE TABLE Employee_Attendance (
        Att_ID          INT IDENTITY(1,1) PRIMARY KEY,
        Employee_ID     INT NOT NULL REFERENCES Employees(Employee_ID),
        Att_Date        DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        Shift_ID        INT NULL,
        In_Time         DATETIME NULL,
        Out_Time        DATETIME NULL,
        Total_Hours     DECIMAL(5,2) NULL,
        Status          NVARCHAR(20) DEFAULT 'Absent'
                        CHECK (Status IN ('Present','Absent','Half Day','Off','Holiday','Late')),
        Marked_By       INT NULL REFERENCES Employees(Employee_ID), -- NULL = self
        Remarks         NVARCHAR(200) NULL,
        Created_At      DATETIME DEFAULT GETDATE(),
        UNIQUE (Employee_ID, Att_Date)
    );
    PRINT 'Employee_Attendance created ✓';
END
GO

-- Shift Master
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Shifts')
BEGIN
    CREATE TABLE Shifts (
        Shift_ID        INT IDENTITY(1,1) PRIMARY KEY,
        Shift_Name      NVARCHAR(50) NOT NULL,
        Start_Time      TIME NOT NULL,
        End_Time        TIME NOT NULL,
        Is_Active       BIT DEFAULT 1
    );
    INSERT INTO Shifts(Shift_Name, Start_Time, End_Time) VALUES
        ('Morning',  '08:00', '16:00'),
        ('Evening',  '16:00', '00:00'),
        ('Night',    '00:00', '08:00'),
        ('Full Day', '09:00', '18:00');
    PRINT 'Shifts created ✓';
END
GO

-- Roster Table (Admin assigns shifts/OFF days)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Roster')
BEGIN
    CREATE TABLE Roster (
        Roster_ID       INT IDENTITY(1,1) PRIMARY KEY,
        Employee_ID     INT NOT NULL REFERENCES Employees(Employee_ID),
        Roster_Date     DATE NOT NULL,
        Shift_ID        INT NULL REFERENCES Shifts(Shift_ID),
        Is_Off_Day      BIT DEFAULT 0,
        Notes           NVARCHAR(200) NULL,
        Assigned_By     INT NULL REFERENCES Employees(Employee_ID),
        Created_At      DATETIME DEFAULT GETDATE(),
        UNIQUE (Employee_ID, Roster_Date)
    );
    PRINT 'Roster created ✓';
END
GO

PRINT '✅ v4.1 upgrade complete!';
GO

-- ============================================================
-- v4.2: Job Request Table (operator requests a job)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Job_Requests')
BEGIN
    CREATE TABLE Job_Requests (
        Request_ID      INT IDENTITY(1,1) PRIMARY KEY,
        Employee_ID     INT NOT NULL REFERENCES Employees(Employee_ID),
        Machine_ID      INT NULL REFERENCES Machines(Machine_ID),
        Request_Type    NVARCHAR(20) DEFAULT 'Job'  -- 'Job' or 'Advance'
                        CHECK (Request_Type IN ('Job','Advance')),
        Description     NVARCHAR(500) NULL,
        Status          NVARCHAR(20) DEFAULT 'Pending'
                        CHECK (Status IN ('Pending','Acknowledged','Closed')),
        Request_Date    DATETIME DEFAULT GETDATE(),
        Acknowledged_By INT NULL REFERENCES Employees(Employee_ID),
        Acknowledged_At DATETIME NULL,
        Notes           NVARCHAR(300) NULL
    );
    PRINT 'Job_Requests table created ✓';
END
GO
PRINT '✅ v4.2 upgrade complete!';
GO

-- Job_Requests table (operator → owner alert for job assignment)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Job_Requests')
BEGIN
    CREATE TABLE Job_Requests (
        Request_ID       INT IDENTITY(1,1) PRIMARY KEY,
        Employee_ID      INT NOT NULL REFERENCES Employees(Employee_ID),
        Machine_ID       INT NULL REFERENCES Machines(Machine_ID),
        Request_Type     NVARCHAR(50) DEFAULT 'Job Assignment',
        Description      NVARCHAR(500) NULL,
        Status           NVARCHAR(20) DEFAULT 'Pending'
                         CHECK (Status IN ('Pending','Acknowledged','Rejected')),
        Request_Date     DATETIME DEFAULT GETDATE(),
        Acknowledged_By  INT NULL REFERENCES Employees(Employee_ID),
        Acknowledged_At  DATETIME NULL
    );
    PRINT 'Job_Requests table created ✓';
END
GO

-- ============================================================
-- v4.2: Customer Portal — Login credentials + Order Requests
-- ============================================================

-- Add login credentials to Customer_Master
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Customer_Master') AND name='Portal_Username')
    ALTER TABLE Customer_Master ADD Portal_Username NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Customer_Master') AND name='Portal_Password')
    ALTER TABLE Customer_Master ADD Portal_Password NVARCHAR(200) NULL;  -- bcrypt hash
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Customer_Master') AND name='Portal_Active')
    ALTER TABLE Customer_Master ADD Portal_Active BIT DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Customer_Master') AND name='Email')
    ALTER TABLE Customer_Master ADD Email NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Customer_Master') AND name='Logo_Path')
    ALTER TABLE Customer_Master ADD Logo_Path NVARCHAR(300) NULL;
PRINT 'Customer portal columns added ✓';
GO

-- Customer Order Requests (customer submits from portal, owner approves → becomes Job)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Order_Requests')
BEGIN
    CREATE TABLE Order_Requests (
        Request_ID      INT IDENTITY(1,1) PRIMARY KEY,
        Customer_ID     INT NOT NULL REFERENCES Customer_Master(Customer_ID),
        Request_Date    DATETIME DEFAULT GETDATE(),
        -- Order details
        Label_Name      NVARCHAR(100) NULL,
        Label_Type      NVARCHAR(50)  NULL,
        Size            NVARCHAR(50)  NULL,
        Quantity        INT NOT NULL,
        Paper           NVARCHAR(50)  NULL,
        Core            NVARCHAR(20)  NULL,
        Packing         NVARCHAR(50)  NULL,
        Notes           NVARCHAR(500) NULL,
        -- File attachments (design/artwork)
        Artwork_Path    NVARCHAR(300) NULL,
        -- Delivery
        Required_By     DATE NULL,
        Delivery_Address NVARCHAR(300) NULL,
        -- Status flow
        Status          NVARCHAR(20) DEFAULT 'Pending'
                        CHECK (Status IN ('Pending','Reviewing','Approved','Rejected','In Production','Completed','Dispatched')),
        Owner_Notes     NVARCHAR(300) NULL,  -- owner feedback to customer
        Reviewed_By     INT NULL REFERENCES Employees(Employee_ID),
        Reviewed_At     DATETIME NULL,
        -- Link to actual job once approved
        Job_ID          INT NULL REFERENCES Jobs(Job_ID)
    );
    PRINT 'Order_Requests created ✓';
END
GO

PRINT '✅ v4.2 upgrade complete!';
GO
