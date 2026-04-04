-- upgrade_impressions.sql
-- Run this on existing installations to add Hourly Impressions feature

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Hourly_Impressions')
BEGIN
    CREATE TABLE Hourly_Impressions (
        Log_ID           INT IDENTITY(1,1) PRIMARY KEY,
        Machine_ID       INT NOT NULL,
        Operator_ID      INT NOT NULL,
        Job_ID           INT NULL,
        Log_Date         DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        Log_Hour         INT NOT NULL,          -- 0-23
        Impressions_Count INT NOT NULL DEFAULT 0,
        Remarks          NVARCHAR(200) NULL,
        Created_At       DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (Machine_ID)  REFERENCES Machines(Machine_ID),
        FOREIGN KEY (Operator_ID) REFERENCES Employees(Employee_ID)
    );
    PRINT 'Hourly_Impressions table created';
END
ELSE
    PRINT 'Hourly_Impressions table already exists - skipped';
GO

-- Add target impressions to Machines table (flat belt / rotary targets)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Machines' AND COLUMN_NAME='Target_Impressions_Per_Hour')
BEGIN
    ALTER TABLE Machines ADD Target_Impressions_Per_Hour INT NULL DEFAULT 0;
    PRINT 'Added Target_Impressions_Per_Hour to Machines';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Machines' AND COLUMN_NAME='Machine_Category')
BEGIN
    ALTER TABLE Machines ADD Machine_Category NVARCHAR(30) NULL DEFAULT 'Flat Belt';
    -- e.g. 'Flat Belt', 'Rotary', 'Semi-Rotary', 'Digital'
    PRINT 'Added Machine_Category to Machines';
END
GO

PRINT '✅ Hourly Impressions upgrade complete';
GO
