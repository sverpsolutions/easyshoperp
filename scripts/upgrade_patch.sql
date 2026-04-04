-- ============================================================
-- UPGRADE PATCH v2.0 - Run on existing BarcodeMES database
-- Adds new job fields + fixes stored procedures
-- ============================================================
USE BarcodeMES;
GO

-- Add new columns to Jobs table
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Order_Date')
    ALTER TABLE Jobs ADD Order_Date DATE DEFAULT CAST(GETDATE() AS DATE);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Mobile_No')
    ALTER TABLE Jobs ADD Mobile_No NVARCHAR(20) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Delivery_Date')
    ALTER TABLE Jobs ADD Delivery_Date DATE NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Label')
    ALTER TABLE Jobs ADD Label NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='UPS')
    ALTER TABLE Jobs ADD UPS INT DEFAULT 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Gap_Type')
    ALTER TABLE Jobs ADD Gap_Type NVARCHAR(20) DEFAULT 'With Gap';
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Paper')
    ALTER TABLE Jobs ADD Paper NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Core')
    ALTER TABLE Jobs ADD Core NVARCHAR(30) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Packing')
    ALTER TABLE Jobs ADD Packing NVARCHAR(50) NULL;
-- Add Dispatched to Status check constraint
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK__Jobs__Status__' OR name LIKE '%Status%' AND parent_object_id=OBJECT_ID('Jobs'))
BEGIN
    DECLARE @cname NVARCHAR(200);
    SELECT @cname = name FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID('Jobs') AND name LIKE '%Status%';
    IF @cname IS NOT NULL EXEC('ALTER TABLE Jobs DROP CONSTRAINT ' + @cname);
    ALTER TABLE Jobs ADD CONSTRAINT CK_Jobs_Status CHECK (Status IN ('Pending','Assigned','Running','Paused','Completed','Cancelled','Dispatched'));
END
GO

-- Fix sp_StopJob (keep operator on machine)
CREATE OR ALTER PROCEDURE sp_StopJob
    @Job_ID INT, @Machine_ID INT, @Produced_Qty INT, @Status NVARCHAR(20) = 'Completed'
AS BEGIN
    SET NOCOUNT ON; BEGIN TRANSACTION;
    UPDATE Jobs SET Status=@Status, Produced_Qty=Produced_Qty+@Produced_Qty, End_Time=GETDATE() WHERE Job_ID=@Job_ID;
    UPDATE Machines SET Status='Idle', Current_Job_ID=NULL, Last_OFF_Time=GETDATE() WHERE Machine_ID=@Machine_ID;
    UPDATE Machine_Log SET End_Time=GETDATE(), Total_Run_Minutes=DATEDIFF(MINUTE,Start_Time,GETDATE())
    WHERE Machine_ID=@Machine_ID AND Job_ID=@Job_ID AND End_Time IS NULL;
    COMMIT TRANSACTION;
END;
GO

-- Fix sp_DailyProductionReport with new fields
CREATE OR ALTER PROCEDURE sp_DailyProductionReport
    @FromDate DATE, @ToDate DATE
AS BEGIN
    SET NOCOUNT ON;
    SELECT CAST(jpl.Entry_Time AS DATE) AS Production_Date,
           j.Job_Number, j.Customer_Name, j.Size, j.Label_Type,
           ISNULL(j.UPS,1) AS UPS, ISNULL(j.Gap_Type,'—') AS Gap_Type,
           ISNULL(j.Paper,'—') AS Paper, ISNULL(j.Core,'—') AS Core,
           ISNULL(j.Packing,'—') AS Packing,
           m.Machine_Name, e.Name AS Operator_Name, SUM(jpl.Qty_Produced) AS Total_Qty
    FROM Job_Production_Log jpl
    JOIN Jobs j ON j.Job_ID=jpl.Job_ID
    JOIN Machines m ON m.Machine_ID=jpl.Machine_ID
    JOIN Employees e ON e.Employee_ID=jpl.Operator_ID
    WHERE CAST(jpl.Entry_Time AS DATE) BETWEEN @FromDate AND @ToDate
    GROUP BY CAST(jpl.Entry_Time AS DATE), j.Job_Number, j.Customer_Name, j.Size,
             j.Label_Type, j.UPS, j.Gap_Type, j.Paper, j.Core, j.Packing, m.Machine_Name, e.Name
    ORDER BY Production_Date DESC;
END;
GO

PRINT 'Upgrade patch v2.0 applied successfully!';
GO
