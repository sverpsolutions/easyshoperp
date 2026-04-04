-- ============================================================
-- UPGRADE v2.1: Telegram + Settings + New Report Columns
-- Run on existing BarcodeMES database
-- ============================================================
USE BarcodeMES;
GO

-- 1. Settings table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='Settings' AND type='U')
CREATE TABLE Settings (
    setting_key   NVARCHAR(100) PRIMARY KEY,
    setting_value NVARCHAR(500) NOT NULL DEFAULT '',
    setting_label NVARCHAR(200),
    setting_group NVARCHAR(50) DEFAULT 'general'
);
GO

-- 2. Default settings
MERGE Settings AS T
USING (VALUES
  ('telegram_enabled',        '0',  'Enable Telegram Notifications',          'telegram'),
  ('telegram_bot_token',      '',   'Telegram Bot Token',                     'telegram'),
  ('telegram_owner_chat_id',  '',   'Owner Chat ID',                          'telegram'),
  ('notify_on_job_start',     '1',  'Notify when job starts',                 'telegram'),
  ('notify_on_job_complete',  '1',  'Notify when job completes',              'telegram'),
  ('notify_on_log',           '0',  'Notify on every production log entry',   'telegram'),
  ('notify_milestones',       '1',  'Notify at 25% / 50% / 75% milestones',  'telegram'),
  ('notify_status_change',    '1',  'Notify on status changes',               'telegram'),
  ('factory_name',            'Barcode Label Factory', 'Factory Name',        'general'),
  ('factory_mobile',          '',   'Factory Mobile / WhatsApp',              'general')
) AS S(k,v,l,g)
ON T.setting_key = S.k
WHEN NOT MATCHED THEN INSERT(setting_key,setting_value,setting_label,setting_group) VALUES(S.k,S.v,S.l,S.g);
GO

-- 3. Add Telegram columns to Jobs (safe, only if missing)
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Telegram_Notify')
    ALTER TABLE Jobs ADD Telegram_Notify BIT NOT NULL DEFAULT 0;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Customer_Chat_ID')
    ALTER TABLE Jobs ADD Customer_Chat_ID NVARCHAR(50) NULL;

-- 4. Other v2 columns if missing
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Order_Date')
    ALTER TABLE Jobs ADD Order_Date DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE);
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Mobile_No')
    ALTER TABLE Jobs ADD Mobile_No NVARCHAR(20) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Delivery_Date')
    ALTER TABLE Jobs ADD Delivery_Date DATE NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Label')
    ALTER TABLE Jobs ADD Label NVARCHAR(100) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='UPS')
    ALTER TABLE Jobs ADD UPS INT NOT NULL DEFAULT 1;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Gap_Type')
    ALTER TABLE Jobs ADD Gap_Type NVARCHAR(20) NOT NULL DEFAULT 'With Gap';
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Paper')
    ALTER TABLE Jobs ADD Paper NVARCHAR(50) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Core')
    ALTER TABLE Jobs ADD Core NVARCHAR(30) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Jobs') AND name='Packing')
    ALTER TABLE Jobs ADD Packing NVARCHAR(50) NULL;
GO

-- 5. Update stored procedures
CREATE OR ALTER PROCEDURE sp_StartJob @Job_ID INT, @Machine_ID INT, @Operator_ID INT AS BEGIN
    SET NOCOUNT ON; BEGIN TRANSACTION;
    UPDATE Jobs SET Status='Running', Start_Time=GETDATE(),
        Assigned_Machine_ID=@Machine_ID, Assigned_Operator_ID=@Operator_ID
    WHERE Job_ID=@Job_ID;
    UPDATE Machines SET Status='Running', Current_Job_ID=@Job_ID,
        Current_Operator_ID=@Operator_ID, Last_ON_Time=GETDATE()
    WHERE Machine_ID=@Machine_ID;
    INSERT INTO Machine_Log(Machine_ID,Operator_ID,Job_ID,Status) VALUES(@Machine_ID,@Operator_ID,@Job_ID,'Running');
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE sp_StopJob @Job_ID INT, @Machine_ID INT, @Produced_Qty INT, @Status NVARCHAR(20)='Completed' AS BEGIN
    SET NOCOUNT ON; BEGIN TRANSACTION;
    UPDATE Jobs SET Status=@Status, Produced_Qty=Produced_Qty+@Produced_Qty, End_Time=GETDATE() WHERE Job_ID=@Job_ID;
    UPDATE Machines SET Status='Idle', Current_Job_ID=NULL, Last_OFF_Time=GETDATE() WHERE Machine_ID=@Machine_ID;
    UPDATE Machine_Log SET End_Time=GETDATE(), Total_Run_Minutes=DATEDIFF(MINUTE,Start_Time,GETDATE())
    WHERE Machine_ID=@Machine_ID AND Job_ID=@Job_ID AND End_Time IS NULL;
    COMMIT TRANSACTION;
END;
GO

CREATE OR ALTER PROCEDURE sp_LogProduction @Job_ID INT, @Operator_ID INT, @Machine_ID INT, @Qty INT AS BEGIN
    SET NOCOUNT ON;
    INSERT INTO Job_Production_Log(Job_ID,Operator_ID,Machine_ID,Qty_Produced) VALUES(@Job_ID,@Operator_ID,@Machine_ID,@Qty);
    UPDATE Jobs SET Produced_Qty=Produced_Qty+@Qty WHERE Job_ID=@Job_ID;
END;
GO

PRINT '✅ Upgrade v2.1 applied successfully!';
GO
