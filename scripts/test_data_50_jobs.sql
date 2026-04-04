-- ============================================================
-- TEST DATA: 50 Random Jobs for Barcode Label MES
-- Run in SQL Server Management Studio on BarcodeMES database
-- ============================================================

SET NOCOUNT ON;

DECLARE @BaseDate DATE = '2026-01-01';

-- Lookup arrays via temp table
CREATE TABLE #Names (id INT IDENTITY(1,1), nm NVARCHAR(60));
INSERT INTO #Names(nm) VALUES
('SHARAN TRADING'),('MEHTA INDUSTRIES'),('PATEL EXPORTS'),('SV ERP SOLUTIONS'),
('RAJAN LABELS PVT LTD'),('KRISHNA PACKAGING'),('SUNRISE INDUSTRIES'),
('BHARAT STICKERS CO'),('NATIONAL LABELS'),('RAJPUT ENTERPRISES'),
('OMEGA PRINT WORKS'),('DELTA PACKAGING'),('GALAXY TRADERS'),
('PIONEER LABELS'),('EXCEL PACKAGING SOLUTIONS'),('ALPHA PRINT'),
('DIAMOND INDUSTRIES'),('GOLDEN STICKERS'),('SILVER MARK PVT LTD'),
('HORIZON TRADERS');

CREATE TABLE #Mobiles (id INT IDENTITY(1,1), mob NVARCHAR(15));
INSERT INTO #Mobiles(mob) VALUES
('9871118688'),('9822334455'),('9844556677'),('9811122828'),('9900112233'),
('9876543210'),('9988776655'),('9765432109'),('9654321098'),('9543210987');

CREATE TABLE #Sizes (id INT IDENTITY(1,1), sz NVARCHAR(20));
INSERT INTO #Sizes(sz) VALUES
('38X25'),('50X30'),('25X15'),('100X100'),('50X40'),('75X50'),
('40X25'),('60X40'),('30X20'),('80X60'),('45X30'),('100X50'),
('35X25'),('55X35'),('70X45');

CREATE TABLE #Labels (id INT IDENTITY(1,1), lb NVARCHAR(40));
INSERT INTO #Labels(lb) VALUES
('Product Label'),('Barcode Label'),('Mini Label'),('Garment Label'),
('Price Label'),('Shipping Label'),('Address Label'),('QR Code Label'),
('Fragile Label'),('Serial Number Label'),('Date Code Label'),('Asset Tag');

CREATE TABLE #Papers (id INT IDENTITY(1,1), pp NVARCHAR(10));
INSERT INTO #Papers(pp) VALUES('TT'),('PE'),('BOPP'),('DT'),('CROMO'),('ART');

CREATE TABLE #Cores (id INT IDENTITY(1,1), co NVARCHAR(10));
INSERT INTO #Cores(co) VALUES('1"/out'),('3"/out'),('1" OUT'),('3" OUT'),('1"'),('3"');

CREATE TABLE #Packings (id INT IDENTITY(1,1), pk NVARCHAR(30));
INSERT INTO #Packings(pk) VALUES
('4 BOX'),('1 ROLL'),('2 BOX'),('400 ST ,10ROLL BOX'),
('4 ROLL'),('6 ROLL'),('12 ROLL BOX'),('500 ST ,5ROLL BOX'),
('2 ROLL'),('10 BOX');

-- Machines: 1-16, Operators: 3,4,5,13 (existing)
CREATE TABLE #MachineIDs (id INT IDENTITY(1,1), mid INT);
INSERT INTO #MachineIDs(mid) VALUES(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16);

CREATE TABLE #OperatorIDs (id INT IDENTITY(1,1), oid INT);
INSERT INTO #OperatorIDs(oid) VALUES(3),(4),(5),(13);

CREATE TABLE #Statuses (id INT IDENTITY(1,1), st NVARCHAR(15));
INSERT INTO #Statuses(st) VALUES('Completed'),('Completed'),('Completed'),('Dispatched'),
('Dispatched'),('Running'),('Assigned'),('Pending'),('Cancelled');

DECLARE @i INT = 1;
DECLARE @yr INT;
DECLARE @orderDate DATE, @deliveryDate DATE, @startTime DATETIME, @endTime DATETIME;
DECLARE @statusSel NVARCHAR(15);
DECLARE @reqQty INT, @prodQty INT;
DECLARE @nameCount INT = (SELECT COUNT(*) FROM #Names);
DECLARE @mobCount  INT = (SELECT COUNT(*) FROM #Mobiles);
DECLARE @sizeCount INT = (SELECT COUNT(*) FROM #Sizes);
DECLARE @lbCount   INT = (SELECT COUNT(*) FROM #Labels);
DECLARE @ppCount   INT = (SELECT COUNT(*) FROM #Papers);
DECLARE @coCount   INT = (SELECT COUNT(*) FROM #Cores);
DECLARE @pkCount   INT = (SELECT COUNT(*) FROM #Packings);
DECLARE @mcCount   INT = (SELECT COUNT(*) FROM #MachineIDs);
DECLARE @opCount   INT = (SELECT COUNT(*) FROM #OperatorIDs);
DECLARE @stCount   INT = (SELECT COUNT(*) FROM #Statuses);

WHILE @i <= 50
BEGIN
    -- Random order date between Jan 2026 and today
    SET @orderDate   = DATEADD(DAY, ABS(CHECKSUM(NEWID())) % 55, '2026-01-01');
    SET @deliveryDate= DATEADD(DAY, (ABS(CHECKSUM(NEWID())) % 10) + 3, @orderDate);
    
    -- Random status
    DECLARE @stIdx INT = (ABS(CHECKSUM(NEWID())) % @stCount) + 1;
    SET @statusSel = (SELECT st FROM #Statuses WHERE id = @stIdx);
    
    -- Random qty
    SET @reqQty = ((ABS(CHECKSUM(NEWID())) % 49) + 1) * 1000; -- 1000 to 50000
    
    SET @prodQty = CASE
        WHEN @statusSel IN ('Completed','Dispatched') THEN @reqQty + (ABS(CHECKSUM(NEWID())) % 500)
        WHEN @statusSel = 'Running'   THEN @reqQty * (ABS(CHECKSUM(NEWID())) % 90 + 5) / 100
        WHEN @statusSel = 'Assigned'  THEN 0
        WHEN @statusSel = 'Pending'   THEN 0
        WHEN @statusSel = 'Cancelled' THEN @reqQty * (ABS(CHECKSUM(NEWID())) % 40) / 100
        ELSE 0
    END;

    -- Start / End times
    SET @startTime = CASE
        WHEN @statusSel IN ('Completed','Dispatched','Running','Cancelled')
             THEN DATEADD(HOUR, 8 + ABS(CHECKSUM(NEWID())) % 8, CAST(@orderDate AS DATETIME))
        ELSE NULL
    END;
    SET @endTime = CASE
        WHEN @statusSel IN ('Completed','Dispatched')
             THEN DATEADD(HOUR, ABS(CHECKSUM(NEWID())) % 10 + 2, @startTime)
        ELSE NULL
    END;

    -- Determine job year from order date
    SET @yr = YEAR(@orderDate);

    -- Get year-specific next sequence
    DECLARE @seq INT;
    SELECT @seq = ISNULL(MAX(CAST(SUBSTRING(Job_Number, 8, 4) AS INT)), 0) + 1
    FROM Jobs WHERE Job_Number LIKE 'J-' + CAST(@yr AS NVARCHAR) + '-%';

    DECLARE @jobNum NVARCHAR(20) = 'J-' + CAST(@yr AS NVARCHAR) + '-' + RIGHT('0000' + CAST(@seq AS NVARCHAR), 4);

    -- Random label type
    DECLARE @labelType NVARCHAR(10) = CASE WHEN ABS(CHECKSUM(NEWID())) % 2 = 0 THEN 'Plain' ELSE 'Printed' END;
    DECLARE @gap NVARCHAR(10)       = CASE WHEN ABS(CHECKSUM(NEWID())) % 2 = 0 THEN 'No Gap' ELSE 'With Gap' END;
    DECLARE @ups INT                = (ABS(CHECKSUM(NEWID())) % 4) + 1;
    DECLARE @pri INT                = (ABS(CHECKSUM(NEWID())) % 5) + 1;

    -- Random FK lookups
    DECLARE @mid INT = (SELECT mid FROM #MachineIDs WHERE id = (ABS(CHECKSUM(NEWID())) % @mcCount) + 1);
    DECLARE @oid INT = (SELECT oid FROM #OperatorIDs WHERE id = (ABS(CHECKSUM(NEWID())) % @opCount) + 1);

    -- For pending/assigned use NULL machine/operator
    IF @statusSel = 'Pending' BEGIN SET @mid = NULL; SET @oid = NULL; END

    INSERT INTO Jobs (
        Job_Number, Order_Date, Customer_Name, Mobile_No, Delivery_Date,
        Size, Label, UPS, Gap_Type, Paper, Core, Packing, Label_Type,
        Required_Qty, Produced_Qty, Status, Priority, Notes,
        Created_Date, Assigned_Machine_ID, Assigned_Operator_ID,
        Start_Time, End_Time, Telegram_Notify, Customer_Chat_ID
    )
    VALUES (
        @jobNum,
        @orderDate,
        (SELECT nm  FROM #Names   WHERE id = (ABS(CHECKSUM(NEWID())) % @nameCount) + 1),
        (SELECT mob FROM #Mobiles WHERE id = (ABS(CHECKSUM(NEWID())) % @mobCount)  + 1),
        @deliveryDate,
        (SELECT sz  FROM #Sizes   WHERE id = (ABS(CHECKSUM(NEWID())) % @sizeCount) + 1),
        (SELECT lb  FROM #Labels  WHERE id = (ABS(CHECKSUM(NEWID())) % @lbCount)   + 1),
        @ups, @gap,
        (SELECT pp  FROM #Papers  WHERE id = (ABS(CHECKSUM(NEWID())) % @ppCount)   + 1),
        (SELECT co  FROM #Cores   WHERE id = (ABS(CHECKSUM(NEWID())) % @coCount)   + 1),
        (SELECT pk  FROM #Packings WHERE id = (ABS(CHECKSUM(NEWID())) % @pkCount)  + 1),
        @labelType,
        @reqQty, @prodQty, @statusSel, @pri, NULL,
        GETDATE(),
        @mid, @oid,
        @startTime, @endTime,
        0, NULL
    );

    SET @i = @i + 1;
END;

-- Cleanup
DROP TABLE #Names; DROP TABLE #Mobiles; DROP TABLE #Sizes; DROP TABLE #Labels;
DROP TABLE #Papers; DROP TABLE #Cores; DROP TABLE #Packings;
DROP TABLE #MachineIDs; DROP TABLE #OperatorIDs; DROP TABLE #Statuses;

-- Confirmation
SELECT 
    Status,
    COUNT(*) AS Count,
    SUM(Required_Qty) AS Total_Required,
    SUM(Produced_Qty) AS Total_Produced
FROM Jobs
GROUP BY Status
ORDER BY Count DESC;

PRINT '✅ 50 test jobs inserted successfully!';
GO
