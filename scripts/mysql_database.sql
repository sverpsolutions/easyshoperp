-- ============================================================
-- BARCODE MES SYSTEM — Full MySQL Database Setup
-- Run in phpMyAdmin or: mysql -u root -p < mysql_database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS BarcodeMES CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE BarcodeMES;

-- ─────────────────────────────────────────────────────────────
-- 1. EMPLOYEES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Employees (
    Employee_ID         INT AUTO_INCREMENT PRIMARY KEY,
    Name                VARCHAR(100) NOT NULL,
    Role                VARCHAR(20)  NOT NULL,
    Mobile              VARCHAR(20)  NULL,
    Username            VARCHAR(50)  NOT NULL UNIQUE,
    Password_Hash       VARCHAR(256) NOT NULL,
    Is_Active           TINYINT(1)   DEFAULT 1,
    Created_Date        DATETIME     DEFAULT NOW(),
    Last_Login          DATETIME     NULL,
    -- Extended fields (v4)
    Father_Name         VARCHAR(100) NULL,
    Address             VARCHAR(300) NULL,
    Aadhar_No           VARCHAR(20)  NULL,
    Join_Date           DATE         NULL,
    Monthly_Salary      DECIMAL(10,2) DEFAULT 0,
    Bank_Name           VARCHAR(100) NULL,
    Bank_Account        VARCHAR(30)  NULL,
    Bank_IFSC           VARCHAR(20)  NULL,
    Advance_Limit_Monthly DECIMAL(10,2) DEFAULT 5000,
    Total_Advance_Balance DECIMAL(10,2) DEFAULT 0,
    Emergency_Contact   VARCHAR(20)  NULL,
    Photo_Path          VARCHAR(300) NULL,
    Resume_Path         VARCHAR(300) NULL,
    Aadhar_Path         VARCHAR(300) NULL,
    CONSTRAINT chk_emp_role CHECK (Role IN ('Owner','Admin','Operator'))
);

-- ─────────────────────────────────────────────────────────────
-- 2. MACHINES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Machines (
    Machine_ID                   INT AUTO_INCREMENT PRIMARY KEY,
    Machine_Name                 VARCHAR(50)  NOT NULL,
    Machine_Type                 VARCHAR(10)  NOT NULL,
    Status                       VARCHAR(15)  DEFAULT 'Idle',
    Current_Operator_ID          INT          NULL,
    Current_Job_ID               INT          NULL,
    Last_ON_Time                 DATETIME     NULL,
    Last_OFF_Time                DATETIME     NULL,
    Location                     VARCHAR(50)  NULL,
    Notes                        VARCHAR(200) NULL,
    Target_Impressions_Per_Hour  INT          DEFAULT 0,
    Machine_Category             VARCHAR(30)  DEFAULT 'Flat Belt',
    CONSTRAINT chk_mach_type   CHECK (Machine_Type IN ('Auto','Manual')),
    CONSTRAINT chk_mach_status CHECK (Status IN ('Running','Idle','Stopped','Maintenance'))
);

-- ─────────────────────────────────────────────────────────────
-- 3. CUSTOMER MASTER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Customer_Master (
    Customer_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Customer_Name     VARCHAR(100) NOT NULL,
    Mobile            VARCHAR(20)  NOT NULL,
    Alt_Mobile        VARCHAR(20)  NULL,
    Address           VARCHAR(300) NULL,
    City              VARCHAR(50)  NULL,
    GST_No            VARCHAR(20)  NULL,
    Category          VARCHAR(20)  DEFAULT 'Regular',
    Credit_Limit      DECIMAL(12,2) DEFAULT 0,
    Opening_Balance   DECIMAL(12,2) DEFAULT 0,
    Current_Balance   DECIMAL(12,2) DEFAULT 0,
    Notes             VARCHAR(500) NULL,
    Is_Active         TINYINT(1)   DEFAULT 1,
    Created_Date      DATETIME     DEFAULT NOW(),
    Portal_Username   VARCHAR(50)  NULL,
    Portal_Password   VARCHAR(200) NULL,
    Portal_Active     TINYINT(1)   DEFAULT 0,
    Email             VARCHAR(100) NULL,
    Logo_Path         VARCHAR(300) NULL,
    CONSTRAINT chk_cust_cat CHECK (Category IN ('Regular','Wholesale','Retail','Corporate'))
);

-- ─────────────────────────────────────────────────────────────
-- 4. JOBS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Jobs (
    Job_ID               INT AUTO_INCREMENT PRIMARY KEY,
    Job_Number           VARCHAR(30)  NOT NULL UNIQUE,
    Order_Date           DATE         NOT NULL DEFAULT (CURDATE()),
    Customer_Name        VARCHAR(100) NOT NULL,
    Customer_ID          INT          NULL,
    Mobile_No            VARCHAR(20)  NULL,
    Delivery_Date        DATE         NULL,
    Size                 VARCHAR(50)  NULL,
    Label                VARCHAR(100) NULL,
    UPS                  INT          DEFAULT 1,
    Gap_Type             VARCHAR(20)  DEFAULT 'With Gap',
    Paper                VARCHAR(50)  NULL,
    Core                 VARCHAR(30)  NULL,
    Packing              VARCHAR(50)  NULL,
    Label_Type           VARCHAR(20)  NOT NULL DEFAULT 'Plain',
    Required_Qty         INT          NOT NULL,
    Produced_Qty         INT          DEFAULT 0,
    Status               VARCHAR(20)  DEFAULT 'Pending',
    Priority             INT          DEFAULT 5,
    Notes                VARCHAR(500) NULL,
    Created_Date         DATETIME     DEFAULT NOW(),
    Telegram_Notify      TINYINT(1)   DEFAULT 0,
    Customer_Chat_ID     VARCHAR(50)  NULL,
    Assigned_Machine_ID  INT          NULL,
    Assigned_Operator_ID INT          NULL,
    Start_Time           DATETIME     NULL,
    End_Time             DATETIME     NULL,
    Bill_ID              INT          NULL,
    Bill_Status          VARCHAR(20)  DEFAULT 'Not Billed',
    CONSTRAINT chk_job_bill_status CHECK (Bill_Status IN ('Not Billed','Billed','Paid','Partial'))
);

-- ─────────────────────────────────────────────────────────────
-- 5. FOREIGN KEYS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE Machines
    ADD CONSTRAINT FK_Mach_Operator FOREIGN KEY (Current_Operator_ID) REFERENCES Employees(Employee_ID) ON DELETE SET NULL,
    ADD CONSTRAINT FK_Mach_Job      FOREIGN KEY (Current_Job_ID)       REFERENCES Jobs(Job_ID)          ON DELETE SET NULL;

ALTER TABLE Jobs
    ADD CONSTRAINT FK_Job_Customer FOREIGN KEY (Customer_ID)          REFERENCES Customer_Master(Customer_ID) ON DELETE SET NULL,
    ADD CONSTRAINT FK_Job_Machine  FOREIGN KEY (Assigned_Machine_ID)  REFERENCES Machines(Machine_ID)        ON DELETE SET NULL,
    ADD CONSTRAINT FK_Job_Operator FOREIGN KEY (Assigned_Operator_ID) REFERENCES Employees(Employee_ID)      ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- 6. PRODUCTION LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Job_Production_Log (
    Log_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Job_ID       INT          NOT NULL,
    Operator_ID  INT          NOT NULL,
    Machine_ID   INT          NOT NULL,
    Qty_Produced INT          NOT NULL,
    Entry_Time   DATETIME     DEFAULT NOW(),
    Remarks      VARCHAR(200) NULL,
    FOREIGN KEY (Job_ID)      REFERENCES Jobs(Job_ID),
    FOREIGN KEY (Operator_ID) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Machine_ID)  REFERENCES Machines(Machine_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 7. MACHINE LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Machine_Log (
    Log_ID            INT AUTO_INCREMENT PRIMARY KEY,
    Machine_ID        INT         NOT NULL,
    Operator_ID       INT         NULL,
    Job_ID            INT         NULL,
    Status            VARCHAR(15) NOT NULL,
    Start_Time        DATETIME    DEFAULT NOW(),
    End_Time          DATETIME    NULL,
    Total_Run_Minutes INT         NULL,
    FOREIGN KEY (Machine_ID)  REFERENCES Machines(Machine_ID),
    FOREIGN KEY (Operator_ID) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Job_ID)      REFERENCES Jobs(Job_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 8. JOB QUEUE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Job_Queue (
    Queue_ID        INT AUTO_INCREMENT PRIMARY KEY,
    Machine_ID      INT         NOT NULL,
    Job_ID          INT         NOT NULL,
    Sequence_Number INT         NOT NULL,
    Status          VARCHAR(20) DEFAULT 'Waiting',
    Queued_Date     DATETIME    DEFAULT NOW(),
    FOREIGN KEY (Machine_ID) REFERENCES Machines(Machine_ID),
    FOREIGN KEY (Job_ID)     REFERENCES Jobs(Job_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 9. SETTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Settings (
    setting_key   VARCHAR(100) PRIMARY KEY,
    setting_value VARCHAR(500) NOT NULL DEFAULT '',
    setting_label VARCHAR(200) NULL,
    setting_group VARCHAR(50)  DEFAULT 'general'
);

-- ─────────────────────────────────────────────────────────────
-- 10. AUDIT LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Audit_Log (
    Audit_ID    INT AUTO_INCREMENT PRIMARY KEY,
    Employee_ID INT          NULL,
    Action      VARCHAR(200) NOT NULL,
    IP_Address  VARCHAR(50)  NULL,
    Log_Time    DATETIME     DEFAULT NOW(),
    FOREIGN KEY (Employee_ID) REFERENCES Employees(Employee_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 11. EMPLOYEE ADVANCES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Employee_Advances (
    Advance_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Employee_ID      INT          NOT NULL,
    Request_Date     DATETIME     DEFAULT NOW(),
    Amount_Requested DECIMAL(10,2) NOT NULL,
    Reason           VARCHAR(300) NULL,
    Status           VARCHAR(20)  DEFAULT 'Pending',
    Approved_By      INT          NULL,
    Approved_Date    DATETIME     NULL,
    Amount_Approved  DECIMAL(10,2) NULL,
    Reject_Reason    VARCHAR(200) NULL,
    Paid_By          INT          NULL,
    Paid_Date        DATETIME     NULL,
    Amount_Paid      DECIMAL(10,2) NULL,
    Payment_Mode     VARCHAR(20)  DEFAULT 'Cash',
    Is_Deducted      TINYINT(1)   DEFAULT 0,
    Deduct_Month     VARCHAR(7)   NULL,
    Notes            VARCHAR(300) NULL,
    CONSTRAINT chk_adv_status CHECK (Status IN ('Pending','Approved','Rejected','Paid')),
    CONSTRAINT chk_adv_mode   CHECK (Payment_Mode IN ('Cash','Bank Transfer','UPI')),
    FOREIGN KEY (Employee_ID) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Approved_By) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Paid_By)     REFERENCES Employees(Employee_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 12. CUSTOMER PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Customer_Payments (
    Payment_ID    INT AUTO_INCREMENT PRIMARY KEY,
    Customer_ID   INT           NULL,
    Customer_Name VARCHAR(100)  NOT NULL,
    Job_ID        INT           NULL,
    Bill_ID       INT           NULL,
    Payment_Date  DATE          DEFAULT (CURDATE()),
    Payment_Type  VARCHAR(20)   NOT NULL,
    Amount        DECIMAL(12,2) NOT NULL,
    Payment_Mode  VARCHAR(20)   DEFAULT 'Cash',
    Cheque_No     VARCHAR(30)   NULL,
    Reference_No  VARCHAR(50)   NULL,
    Narration     VARCHAR(300)  NULL,
    Balance_After DECIMAL(12,2) NULL,
    Entered_By    INT           NULL,
    Created_Date  DATETIME      DEFAULT NOW(),
    CONSTRAINT chk_pay_type CHECK (Payment_Type IN ('Receipt','Payment','Adjustment','Opening')),
    CONSTRAINT chk_pay_mode CHECK (Payment_Mode IN ('Cash','Cheque','UPI','NEFT','RTGS','Online')),
    FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID),
    FOREIGN KEY (Job_ID)      REFERENCES Jobs(Job_ID),
    FOREIGN KEY (Entered_By)  REFERENCES Employees(Employee_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 13. BILL REGISTER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Bill_Register (
    Bill_ID        INT AUTO_INCREMENT PRIMARY KEY,
    Bill_Number    VARCHAR(50)   NOT NULL UNIQUE,
    Bill_Date      DATE          NOT NULL DEFAULT (CURDATE()),
    Customer_ID    INT           NULL,
    Customer_Name  VARCHAR(100)  NOT NULL,
    Mobile         VARCHAR(20)   NULL,
    Gross_Amount   DECIMAL(12,2) DEFAULT 0,
    Discount_Amt   DECIMAL(12,2) DEFAULT 0,
    Tax_Amount     DECIMAL(12,2) DEFAULT 0,
    Net_Amount     DECIMAL(12,2) NOT NULL,
    Amount_Paid    DECIMAL(12,2) DEFAULT 0,
    Balance_Due    DECIMAL(12,2) DEFAULT 0,
    Payment_Status VARCHAR(20)   DEFAULT 'Unpaid',
    Job_ID         INT           NULL,
    External_Ref   VARCHAR(100)  NULL,
    Items_JSON     LONGTEXT      NULL,
    Notes          VARCHAR(500)  NULL,
    Created_By     INT           NULL,
    Created_Date   DATETIME      DEFAULT NOW(),
    Updated_Date   DATETIME      NULL,
    CONSTRAINT chk_bill_pay_status CHECK (Payment_Status IN ('Unpaid','Partial','Paid','Cancelled')),
    FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID),
    FOREIGN KEY (Job_ID)      REFERENCES Jobs(Job_ID),
    FOREIGN KEY (Created_By)  REFERENCES Employees(Employee_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 14. BILL ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Bill_Items (
    Item_ID     INT AUTO_INCREMENT PRIMARY KEY,
    Bill_ID     INT           NOT NULL,
    Description VARCHAR(200)  NOT NULL,
    Size        VARCHAR(50)   NULL,
    Label_Type  VARCHAR(20)   NULL,
    Qty         INT           DEFAULT 1,
    Rate        DECIMAL(10,2) NOT NULL,
    Amount      DECIMAL(12,2) NOT NULL,
    Tax_Pct     DECIMAL(5,2)  DEFAULT 0,
    Tax_Amount  DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (Bill_ID) REFERENCES Bill_Register(Bill_ID) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 15. HOURLY IMPRESSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Hourly_Impressions (
    Log_ID            INT AUTO_INCREMENT PRIMARY KEY,
    Machine_ID        INT     NOT NULL,
    Operator_ID       INT     NOT NULL,
    Job_ID            INT     NULL,
    Log_Date          DATE    NOT NULL DEFAULT (CURDATE()),
    Log_Hour          INT     NOT NULL,
    Impressions_Count INT     NOT NULL DEFAULT 0,
    Remarks           VARCHAR(200) NULL,
    Created_At        DATETIME     DEFAULT NOW(),
    FOREIGN KEY (Machine_ID)  REFERENCES Machines(Machine_ID),
    FOREIGN KEY (Operator_ID) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Job_ID)      REFERENCES Jobs(Job_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 16. ATTENDANCE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Employee_Attendance (
    Att_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Employee_ID INT          NOT NULL,
    Att_Date    DATE         NOT NULL DEFAULT (CURDATE()),
    Shift_ID    INT          NULL,
    In_Time     DATETIME     NULL,
    Out_Time    DATETIME     NULL,
    Total_Hours DECIMAL(5,2) NULL,
    Status      VARCHAR(20)  DEFAULT 'Absent',
    Marked_By   INT          NULL,
    Remarks     VARCHAR(200) NULL,
    Created_At  DATETIME     DEFAULT NOW(),
    UNIQUE KEY uq_emp_date (Employee_ID, Att_Date),
    CONSTRAINT chk_att_status CHECK (Status IN ('Present','Absent','Half Day','Off','Holiday','Late')),
    FOREIGN KEY (Employee_ID) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Marked_By)   REFERENCES Employees(Employee_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 17. SHIFTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Shifts (
    Shift_ID   INT AUTO_INCREMENT PRIMARY KEY,
    Shift_Name VARCHAR(50) NOT NULL,
    Start_Time TIME        NOT NULL,
    End_Time   TIME        NOT NULL,
    Is_Active  TINYINT(1)  DEFAULT 1
);

-- ─────────────────────────────────────────────────────────────
-- 18. ROSTER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Roster (
    Roster_ID   INT AUTO_INCREMENT PRIMARY KEY,
    Employee_ID INT  NOT NULL,
    Roster_Date DATE NOT NULL,
    Shift_ID    INT  NULL,
    Is_Off_Day  TINYINT(1) DEFAULT 0,
    Notes       VARCHAR(200) NULL,
    Assigned_By INT  NULL,
    Created_At  DATETIME DEFAULT NOW(),
    UNIQUE KEY uq_roster (Employee_ID, Roster_Date),
    FOREIGN KEY (Employee_ID) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Shift_ID)    REFERENCES Shifts(Shift_ID),
    FOREIGN KEY (Assigned_By) REFERENCES Employees(Employee_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 19. JOB REQUESTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Job_Requests (
    Request_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Employee_ID     INT          NOT NULL,
    Machine_ID      INT          NULL,
    Request_Type    VARCHAR(20)  DEFAULT 'Job',
    Description     VARCHAR(500) NULL,
    Status          VARCHAR(20)  DEFAULT 'Pending',
    Request_Date    DATETIME     DEFAULT NOW(),
    Acknowledged_By INT          NULL,
    Acknowledged_At DATETIME     NULL,
    Notes           VARCHAR(300) NULL,
    CONSTRAINT chk_jreq_status CHECK (Status IN ('Pending','Acknowledged','Closed')),
    FOREIGN KEY (Employee_ID)     REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Machine_ID)      REFERENCES Machines(Machine_ID),
    FOREIGN KEY (Acknowledged_By) REFERENCES Employees(Employee_ID)
);

-- ─────────────────────────────────────────────────────────────
-- 20. ORDER REQUESTS (Customer Portal)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Order_Requests (
    Request_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Customer_ID      INT          NOT NULL,
    Request_Date     DATETIME     DEFAULT NOW(),
    Label_Name       VARCHAR(100) NULL,
    Label_Type       VARCHAR(50)  NULL,
    Size             VARCHAR(50)  NULL,
    Quantity         INT          NOT NULL,
    Paper            VARCHAR(50)  NULL,
    Core             VARCHAR(20)  NULL,
    Packing          VARCHAR(50)  NULL,
    Notes            VARCHAR(500) NULL,
    Artwork_Path     VARCHAR(300) NULL,
    Required_By      DATE         NULL,
    Delivery_Address VARCHAR(300) NULL,
    Status           VARCHAR(20)  DEFAULT 'Pending',
    Owner_Notes      VARCHAR(300) NULL,
    Reviewed_By      INT          NULL,
    Reviewed_At      DATETIME     NULL,
    Job_ID           INT          NULL,
    CONSTRAINT chk_order_status CHECK (Status IN ('Pending','Reviewing','Approved','Rejected','In Production','Completed','Dispatched')),
    FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID),
    FOREIGN KEY (Reviewed_By) REFERENCES Employees(Employee_ID),
    FOREIGN KEY (Job_ID)      REFERENCES Jobs(Job_ID)
);

-- ─────────────────────────────────────────────────────────────
-- STORED PROCEDURES
-- ─────────────────────────────────────────────────────────────
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_StartJob $$
CREATE PROCEDURE sp_StartJob(IN p_Job_ID INT, IN p_Machine_ID INT, IN p_Operator_ID INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    UPDATE Jobs SET
        Status               = 'Running',
        Start_Time           = NOW(),
        Assigned_Machine_ID  = p_Machine_ID,
        Assigned_Operator_ID = p_Operator_ID
    WHERE Job_ID = p_Job_ID;

    UPDATE Machines SET
        Status              = 'Running',
        Current_Job_ID      = p_Job_ID,
        Current_Operator_ID = p_Operator_ID,
        Last_ON_Time        = NOW()
    WHERE Machine_ID = p_Machine_ID;

    INSERT INTO Machine_Log (Machine_ID, Operator_ID, Job_ID, Status)
    VALUES (p_Machine_ID, p_Operator_ID, p_Job_ID, 'Running');
    COMMIT;
END $$

DROP PROCEDURE IF EXISTS sp_StopJob $$
CREATE PROCEDURE sp_StopJob(IN p_Job_ID INT, IN p_Machine_ID INT, IN p_Produced_Qty INT, IN p_Status VARCHAR(20))
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    UPDATE Jobs SET
        Status       = p_Status,
        Produced_Qty = Produced_Qty + p_Produced_Qty,
        End_Time     = NOW()
    WHERE Job_ID = p_Job_ID;

    UPDATE Machines SET
        Status         = 'Idle',
        Current_Job_ID = NULL,
        Last_OFF_Time  = NOW()
    WHERE Machine_ID = p_Machine_ID;

    UPDATE Machine_Log SET
        End_Time          = NOW(),
        Total_Run_Minutes = TIMESTAMPDIFF(MINUTE, Start_Time, NOW())
    WHERE Machine_ID = p_Machine_ID AND Job_ID = p_Job_ID AND End_Time IS NULL;
    COMMIT;
END $$

DROP PROCEDURE IF EXISTS sp_LogProduction $$
CREATE PROCEDURE sp_LogProduction(IN p_Job_ID INT, IN p_Operator_ID INT, IN p_Machine_ID INT, IN p_Qty INT)
BEGIN
    INSERT INTO Job_Production_Log (Job_ID, Operator_ID, Machine_ID, Qty_Produced)
    VALUES (p_Job_ID, p_Operator_ID, p_Machine_ID, p_Qty);
    UPDATE Jobs SET Produced_Qty = Produced_Qty + p_Qty WHERE Job_ID = p_Job_ID;
END $$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: Auto-complete job when target qty reached
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_CheckJobCompletion;
CREATE TRIGGER trg_CheckJobCompletion
AFTER INSERT ON Job_Production_Log
FOR EACH ROW
BEGIN
    UPDATE Jobs SET Status = 'Completed', End_Time = NOW()
    WHERE Job_ID = NEW.Job_ID
      AND Produced_Qty >= Required_Qty
      AND Status = 'Running';
END;

-- ─────────────────────────────────────────────────────────────
-- SEED DATA
-- ─────────────────────────────────────────────────────────────

-- Shifts
INSERT INTO Shifts (Shift_Name, Start_Time, End_Time) VALUES
('Morning',  '08:00:00', '16:00:00'),
('Evening',  '16:00:00', '00:00:00'),
('Night',    '00:00:00', '08:00:00'),
('Full Day', '09:00:00', '18:00:00');

-- Employees (passwords are bcrypt hashes — use keygen or update via API)
INSERT INTO Employees (Name, Role, Mobile, Username, Password_Hash) VALUES
('Factory Owner', 'Owner', '9999999999', 'owner', '$2y$10$placeholder_hash_owner_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
('Admin User',    'Admin', '8888888888', 'admin', '$2y$10$placeholder_hash_admin_xxxxxxxxxxxxxxxxxxxxxxxxxxxx');

INSERT INTO Employees (Name, Role, Mobile, Username, Password_Hash) VALUES
('Rahul Sharma', 'Operator', '9111111101', 'rahul',  '$2y$10$placeholder'),
('Suresh Kumar', 'Operator', '9111111102', 'suresh', '$2y$10$placeholder'),
('Amit Verma',   'Operator', '9111111103', 'amit',   '$2y$10$placeholder'),
('Ravi Singh',   'Operator', '9111111104', 'ravi',   '$2y$10$placeholder'),
('Priya Patel',  'Operator', '9111111105', 'priya',  '$2y$10$placeholder'),
('Deepak Yadav', 'Operator', '9111111106', 'deepak', '$2y$10$placeholder'),
('Mohan Das',    'Operator', '9111111107', 'mohan',  '$2y$10$placeholder'),
('Kiran Nair',   'Operator', '9111111108', 'kiran',  '$2y$10$placeholder'),
('Sanjay Gupta', 'Operator', '9111111109', 'sanjay', '$2y$10$placeholder'),
('Vikram Joshi', 'Operator', '9111111110', 'vikram', '$2y$10$placeholder'),
('Anita Rao',    'Operator', '9111111111', 'anita',  '$2y$10$placeholder'),
('Rohit Mehta',  'Operator', '9111111112', 'rohit',  '$2y$10$placeholder'),
('Pooja Shah',   'Operator', '9111111113', 'pooja',  '$2y$10$placeholder'),
('Arun Tiwari',  'Operator', '9111111114', 'arun',   '$2y$10$placeholder'),
('Neha Kapoor',  'Operator', '9111111115', 'neha',   '$2y$10$placeholder');

-- Machines
INSERT INTO Machines (Machine_Name, Machine_Type, Location) VALUES
('Machine-01', 'Auto',   'Section A'),
('Machine-02', 'Auto',   'Section A'),
('Machine-03', 'Auto',   'Section A'),
('Machine-04', 'Auto',   'Section B'),
('Machine-05', 'Auto',   'Section B'),
('Machine-06', 'Manual', 'Section B'),
('Machine-07', 'Manual', 'Section C'),
('Machine-08', 'Manual', 'Section C'),
('Machine-09', 'Auto',   'Section C'),
('Machine-10', 'Auto',   'Section D'),
('Machine-11', 'Manual', 'Section D'),
('Machine-12', 'Auto',   'Section D'),
('Machine-13', 'Manual', 'Section E'),
('Machine-14', 'Auto',   'Section E'),
('Machine-15', 'Manual', 'Section E');

-- Settings
INSERT INTO Settings (setting_key, setting_value, setting_label, setting_group) VALUES
('telegram_enabled',       '0',                     'Enable Telegram Notifications', 'telegram'),
('telegram_bot_token',     '',                      'Telegram Bot Token',            'telegram'),
('telegram_owner_chat_id', '',                      'Owner Chat ID',                 'telegram'),
('notify_on_job_start',    '1',                     'Notify when job starts',        'telegram'),
('notify_on_job_complete', '1',                     'Notify when job completes',     'telegram'),
('notify_on_log',          '0',                     'Notify on every production log','telegram'),
('notify_milestones',      '1',                     'Notify at 25/50/75% milestones','telegram'),
('notify_status_change',   '1',                     'Notify on status changes',      'telegram'),
('factory_name',           'Barcode Label Factory', 'Factory Name',                  'general'),
('factory_mobile',         '',                      'Factory Mobile / WhatsApp',     'general');

SELECT 'BarcodeMES MySQL database ready!' AS message;
