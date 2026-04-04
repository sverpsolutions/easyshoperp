-- ============================================================
-- BARCODE MES SYSTEM - Full Database Setup v2.1
-- ============================================================
USE master;
GO
IF EXISTS (SELECT name FROM sys.databases WHERE name='BarcodeMES')
    DROP DATABASE BarcodeMES;
GO
CREATE DATABASE BarcodeMES;
GO
USE BarcodeMES;
GO

-- 1. EMPLOYEES
CREATE TABLE Employees (
    Employee_ID   INT IDENTITY(1,1) PRIMARY KEY,
    Name          NVARCHAR(100) NOT NULL,
    Role          NVARCHAR(20)  NOT NULL CHECK (Role IN ('Owner','Admin','Operator')),
    Mobile        NVARCHAR(20),
    Username      NVARCHAR(50)  UNIQUE NOT NULL,
    Password_Hash NVARCHAR(256) NOT NULL,
    Is_Active     BIT DEFAULT 1,
    Created_Date  DATETIME DEFAULT GETDATE(),
    Last_Login    DATETIME
);
GO

-- 2. MACHINES
CREATE TABLE Machines (
    Machine_ID          INT IDENTITY(1,1) PRIMARY KEY,
    Machine_Name        NVARCHAR(50)  NOT NULL,
    Machine_Type        NVARCHAR(10)  NOT NULL CHECK (Machine_Type IN ('Auto','Manual')),
    Status              NVARCHAR(15)  DEFAULT 'Idle' CHECK (Status IN ('Running','Idle','Stopped','Maintenance')),
    Current_Operator_ID INT NULL,
    Current_Job_ID      INT NULL,
    Last_ON_Time        DATETIME NULL,
    Last_OFF_Time       DATETIME NULL,
    Location            NVARCHAR(50),
    Notes               NVARCHAR(200)
);
GO

-- 3. JOBS (all fields from the register form)
CREATE TABLE Jobs (
    Job_ID              INT IDENTITY(1,1) PRIMARY KEY,
    Job_Number          NVARCHAR(30)  UNIQUE NOT NULL,
    Order_Date          DATE          NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    Customer_Name       NVARCHAR(100) NOT NULL,
    Mobile_No           NVARCHAR(20),
    Delivery_Date       DATE NULL,
    Size                NVARCHAR(50),
    Label               NVARCHAR(100),
    UPS                 INT DEFAULT 1,
    Gap_Type            NVARCHAR(20)  DEFAULT 'With Gap',
    Paper               NVARCHAR(50),
    Core                NVARCHAR(30),
    Packing             NVARCHAR(50),
    Label_Type          NVARCHAR(20)  NOT NULL DEFAULT 'Plain',
    Required_Qty        INT NOT NULL,
    Produced_Qty        INT DEFAULT 0,
    Status              NVARCHAR(20)  DEFAULT 'Pending',
    Priority            INT DEFAULT 5,
    Notes               NVARCHAR(500),
    Created_Date        DATETIME DEFAULT GETDATE(),
    Telegram_Notify     BIT DEFAULT 0,
    Customer_Chat_ID    NVARCHAR(50) NULL,
    Assigned_Machine_ID INT NULL,
    Assigned_Operator_ID INT NULL,
    Start_Time          DATETIME NULL,
    End_Time            DATETIME NULL
);
GO

-- 4. Foreign keys
ALTER TABLE Machines ADD CONSTRAINT FK_Mach_Operator FOREIGN KEY (Current_Operator_ID) REFERENCES Employees(Employee_ID);
ALTER TABLE Machines ADD CONSTRAINT FK_Mach_Job      FOREIGN KEY (Current_Job_ID)      REFERENCES Jobs(Job_ID);
ALTER TABLE Jobs     ADD CONSTRAINT FK_Job_Machine   FOREIGN KEY (Assigned_Machine_ID)  REFERENCES Machines(Machine_ID);
ALTER TABLE Jobs     ADD CONSTRAINT FK_Job_Operator  FOREIGN KEY (Assigned_Operator_ID) REFERENCES Employees(Employee_ID);
GO

-- 5. PRODUCTION LOG
CREATE TABLE Job_Production_Log (
    Log_ID       INT IDENTITY(1,1) PRIMARY KEY,
    Job_ID       INT NOT NULL REFERENCES Jobs(Job_ID),
    Operator_ID  INT NOT NULL REFERENCES Employees(Employee_ID),
    Machine_ID   INT NOT NULL REFERENCES Machines(Machine_ID),
    Qty_Produced INT NOT NULL,
    Entry_Time   DATETIME DEFAULT GETDATE(),
    Remarks      NVARCHAR(200)
);
GO

-- 6. MACHINE LOG
CREATE TABLE Machine_Log (
    Log_ID            INT IDENTITY(1,1) PRIMARY KEY,
    Machine_ID        INT NOT NULL REFERENCES Machines(Machine_ID),
    Operator_ID       INT NULL REFERENCES Employees(Employee_ID),
    Job_ID            INT NULL REFERENCES Jobs(Job_ID),
    Status            NVARCHAR(15) NOT NULL,
    Start_Time        DATETIME DEFAULT GETDATE(),
    End_Time          DATETIME NULL,
    Total_Run_Minutes INT NULL
);
GO

-- 7. JOB QUEUE
CREATE TABLE Job_Queue (
    Queue_ID        INT IDENTITY(1,1) PRIMARY KEY,
    Machine_ID      INT NOT NULL REFERENCES Machines(Machine_ID),
    Job_ID          INT NOT NULL REFERENCES Jobs(Job_ID),
    Sequence_Number INT NOT NULL,
    Status          NVARCHAR(20) DEFAULT 'Waiting',
    Queued_Date     DATETIME DEFAULT GETDATE()
);
GO

-- 8. SETTINGS
CREATE TABLE Settings (
    setting_key   NVARCHAR(100) PRIMARY KEY,
    setting_value NVARCHAR(500) NOT NULL DEFAULT '',
    setting_label NVARCHAR(200),
    setting_group NVARCHAR(50) DEFAULT 'general'
);
GO

-- 9. AUDIT LOG
CREATE TABLE Audit_Log (
    Audit_ID    INT IDENTITY(1,1) PRIMARY KEY,
    Employee_ID INT NULL REFERENCES Employees(Employee_ID),
    Action      NVARCHAR(200) NOT NULL,
    IP_Address  NVARCHAR(50),
    Log_Time    DATETIME DEFAULT GETDATE()
);
GO

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- sp_StartJob
CREATE OR ALTER PROCEDURE sp_StartJob
    @Job_ID INT, @Machine_ID INT, @Operator_ID INT
AS BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    -- Update job
    UPDATE Jobs SET
        Status              = 'Running',
        Start_Time          = GETDATE(),
        Assigned_Machine_ID  = @Machine_ID,
        Assigned_Operator_ID = @Operator_ID
    WHERE Job_ID = @Job_ID;
    -- Update machine
    UPDATE Machines SET
        Status              = 'Running',
        Current_Job_ID      = @Job_ID,
        Current_Operator_ID = @Operator_ID,
        Last_ON_Time        = GETDATE()
    WHERE Machine_ID = @Machine_ID;
    -- Log activity
    INSERT INTO Machine_Log (Machine_ID, Operator_ID, Job_ID, Status)
    VALUES (@Machine_ID, @Operator_ID, @Job_ID, 'Running');
    COMMIT TRANSACTION;
END;
GO

-- sp_StopJob
CREATE OR ALTER PROCEDURE sp_StopJob
    @Job_ID INT, @Machine_ID INT, @Produced_Qty INT, @Status NVARCHAR(20) = 'Completed'
AS BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    -- Update job
    UPDATE Jobs SET
        Status       = @Status,
        Produced_Qty = Produced_Qty + @Produced_Qty,
        End_Time     = GETDATE()
    WHERE Job_ID = @Job_ID;
    -- Free machine (keep operator assigned for next job)
    UPDATE Machines SET
        Status         = 'Idle',
        Current_Job_ID = NULL,
        Last_OFF_Time  = GETDATE()
    WHERE Machine_ID = @Machine_ID;
    -- Close machine log entry
    UPDATE Machine_Log SET
        End_Time          = GETDATE(),
        Total_Run_Minutes = DATEDIFF(MINUTE, Start_Time, GETDATE())
    WHERE Machine_ID = @Machine_ID AND Job_ID = @Job_ID AND End_Time IS NULL;
    COMMIT TRANSACTION;
END;
GO

-- sp_LogProduction
CREATE OR ALTER PROCEDURE sp_LogProduction
    @Job_ID INT, @Operator_ID INT, @Machine_ID INT, @Qty INT
AS BEGIN
    SET NOCOUNT ON;
    INSERT INTO Job_Production_Log (Job_ID, Operator_ID, Machine_ID, Qty_Produced)
    VALUES (@Job_ID, @Operator_ID, @Machine_ID, @Qty);
    UPDATE Jobs SET Produced_Qty = Produced_Qty + @Qty WHERE Job_ID = @Job_ID;
END;
GO

-- sp_DailyProductionReport
CREATE OR ALTER PROCEDURE sp_DailyProductionReport
    @FromDate DATE, @ToDate DATE
AS BEGIN
    SET NOCOUNT ON;
    SELECT
        CAST(jpl.Entry_Time AS DATE) AS Production_Date,
        j.Job_Number, j.Customer_Name, j.Size, j.Label_Type,
        ISNULL(j.UPS,1) AS UPS, ISNULL(j.Gap_Type,'—') AS Gap_Type,
        ISNULL(j.Paper,'—') AS Paper, ISNULL(j.Core,'—') AS Core,
        ISNULL(j.Packing,'—') AS Packing,
        m.Machine_Name, e.Name AS Operator_Name,
        SUM(jpl.Qty_Produced) AS Total_Qty
    FROM Job_Production_Log jpl
    JOIN Jobs j     ON j.Job_ID       = jpl.Job_ID
    JOIN Machines m ON m.Machine_ID   = jpl.Machine_ID
    JOIN Employees e ON e.Employee_ID = jpl.Operator_ID
    WHERE CAST(jpl.Entry_Time AS DATE) BETWEEN @FromDate AND @ToDate
    GROUP BY
        CAST(jpl.Entry_Time AS DATE), j.Job_Number, j.Customer_Name,
        j.Size, j.Label_Type, j.UPS, j.Gap_Type, j.Paper, j.Core, j.Packing,
        m.Machine_Name, e.Name
    ORDER BY Production_Date DESC;
END;
GO

-- Trigger: auto-complete job when qty reached
CREATE OR ALTER TRIGGER trg_CheckJobCompletion
ON Job_Production_Log AFTER INSERT
AS BEGIN
    SET NOCOUNT ON;
    UPDATE Jobs SET Status='Completed', End_Time=GETDATE()
    WHERE Job_ID IN (
        SELECT i.Job_ID FROM inserted i
        JOIN Jobs j ON j.Job_ID=i.Job_ID
        WHERE j.Produced_Qty >= j.Required_Qty AND j.Status='Running'
    );
END;
GO

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO Employees (Name,Role,Mobile,Username,Password_Hash) VALUES
('Factory Owner','Owner','9999999999','owner','$2b$10$placeholder_hash_owner'),
('Admin User','Admin','8888888888','admin','$2b$10$placeholder_hash_admin');

INSERT INTO Machines (Machine_Name,Machine_Type,Location) VALUES
('Machine-01','Auto','Section A'),('Machine-02','Auto','Section A'),
('Machine-03','Auto','Section A'),('Machine-04','Auto','Section B'),
('Machine-05','Auto','Section B'),('Machine-06','Manual','Section B'),
('Machine-07','Manual','Section C'),('Machine-08','Manual','Section C'),
('Machine-09','Auto','Section C'),('Machine-10','Auto','Section D'),
('Machine-11','Manual','Section D'),('Machine-12','Auto','Section D'),
('Machine-13','Manual','Section E'),('Machine-14','Auto','Section E'),
('Machine-15','Manual','Section E');

INSERT INTO Employees (Name,Role,Mobile,Username,Password_Hash) VALUES
('Rahul Sharma','Operator','9111111101','rahul','$2b$10$placeholder'),
('Suresh Kumar','Operator','9111111102','suresh','$2b$10$placeholder'),
('Amit Verma','Operator','9111111103','amit','$2b$10$placeholder'),
('Ravi Singh','Operator','9111111104','ravi','$2b$10$placeholder'),
('Priya Patel','Operator','9111111105','priya','$2b$10$placeholder'),
('Deepak Yadav','Operator','9111111106','deepak','$2b$10$placeholder'),
('Mohan Das','Operator','9111111107','mohan','$2b$10$placeholder'),
('Kiran Nair','Operator','9111111108','kiran','$2b$10$placeholder'),
('Sanjay Gupta','Operator','9111111109','sanjay','$2b$10$placeholder'),
('Vikram Joshi','Operator','9111111110','vikram','$2b$10$placeholder'),
('Anita Rao','Operator','9111111111','anita','$2b$10$placeholder'),
('Rohit Mehta','Operator','9111111112','rohit','$2b$10$placeholder'),
('Pooja Shah','Operator','9111111113','pooja','$2b$10$placeholder'),
('Arun Tiwari','Operator','9111111114','arun','$2b$10$placeholder'),
('Neha Kapoor','Operator','9111111115','neha','$2b$10$placeholder');

-- Sample jobs
INSERT INTO Jobs (Job_Number,Order_Date,Customer_Name,Mobile_No,Delivery_Date,Size,Label,UPS,Gap_Type,Paper,Core,Packing,Label_Type,Required_Qty,Status,Priority,Assigned_Machine_ID,Assigned_Operator_ID)
VALUES
('J-2025-0001','2025-04-01','SHARAN TRADING','9871118688','2025-04-10','38X25','Product Label',2,'No Gap','TT','1"/out','4 BOX','Plain',4000,'Assigned',3,1,3),
('J-2025-0002','2025-04-02','MEHTA INDUSTRIES','9822334455','2025-04-12','50X30','Barcode Label',1,'With Gap','PE','3"/out','1 ROLL','Printed',2500,'Pending',5,NULL,NULL),
('J-2025-0003','2025-04-03','PATEL EXPORTS','9844556677','2025-04-08','25X15','Mini Label',4,'No Gap','BOPP','1"/out','2 BOX','Plain',8000,'Assigned',2,2,4);

-- Seed Settings
INSERT INTO Settings(setting_key,setting_value,setting_label,setting_group) VALUES
('telegram_enabled','0','Enable Telegram Notifications','telegram'),
('telegram_bot_token','','Telegram Bot Token','telegram'),
('telegram_owner_chat_id','','Owner Chat ID','telegram'),
('notify_on_job_start','1','Notify when job starts','telegram'),
('notify_on_job_complete','1','Notify when job completes','telegram'),
('notify_on_log','0','Notify on every production log entry','telegram'),
('notify_milestones','1','Notify at 25%/50%/75% milestones','telegram'),
('notify_status_change','1','Notify on status changes','telegram'),
('factory_name','Barcode Label Factory','Factory Name','general'),
('factory_mobile','','Factory Mobile / WhatsApp','general');

PRINT 'BarcodeMES v2.1 database ready!';
GO
