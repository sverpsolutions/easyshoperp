-- ============================================================
-- UPGRADE SCRIPT v5.0 — ERP Master Module System
-- Barcode Label, Thermal Roll & Hardware Business
-- Run in phpMyAdmin: USE BarcodeMES; then run this script
-- ============================================================
USE BarcodeMES;

-- ─────────────────────────────────────────────────────────────
-- 1. COMPANY MASTER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Company_Master (
    Company_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Company_Name    VARCHAR(150) NOT NULL,
    Address         VARCHAR(500) NULL,
    City            VARCHAR(80)  NULL,
    State           VARCHAR(80)  NULL,
    Pincode         VARCHAR(10)  NULL,
    Mobile          VARCHAR(20)  NULL,
    Email           VARCHAR(100) NULL,
    Website         VARCHAR(150) NULL,
    GSTIN           VARCHAR(20)  NULL,
    PAN             VARCHAR(15)  NULL,
    Logo_Path       VARCHAR(300) NULL,
    Theme_Color     VARCHAR(20)  DEFAULT '#2563eb',
    Signature_Path  VARCHAR(300) NULL,
    Bank_Name       VARCHAR(100) NULL,
    Bank_Account    VARCHAR(30)  NULL,
    Bank_IFSC       VARCHAR(20)  NULL,
    Bank_Branch     VARCHAR(100) NULL,
    Financial_Year  VARCHAR(10)  DEFAULT '2024-25',
    Is_Active       TINYINT(1)   DEFAULT 1,
    Created_Date    DATETIME     DEFAULT NOW(),
    Updated_Date    DATETIME     DEFAULT NOW() ON UPDATE NOW()
);

-- Insert default company if not exists
INSERT INTO Company_Master (Company_Name, GSTIN, Theme_Color)
SELECT 'EasyShop Marketing Pvt Ltd', '07AABCE1234F1Z5', '#2563eb'
WHERE NOT EXISTS (SELECT 1 FROM Company_Master LIMIT 1);

-- ─────────────────────────────────────────────────────────────
-- 2. GST TAX MASTER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS GST_Tax_Master (
    GST_Tax_ID      INT AUTO_INCREMENT PRIMARY KEY,
    Tax_Name        VARCHAR(50)  NOT NULL,
    CGST_Pct        DECIMAL(5,2) DEFAULT 0,
    SGST_Pct        DECIMAL(5,2) DEFAULT 0,
    IGST_Pct        DECIMAL(5,2) DEFAULT 0,
    Total_Pct       DECIMAL(5,2) GENERATED ALWAYS AS (CGST_Pct + SGST_Pct) STORED,
    Is_Active       TINYINT(1)   DEFAULT 1,
    Created_Date    DATETIME     DEFAULT NOW()
);

-- Seed standard GST slabs
INSERT INTO GST_Tax_Master (Tax_Name, CGST_Pct, SGST_Pct, IGST_Pct) VALUES
('GST 0%',   0,   0,   0),
('GST 5%',   2.5, 2.5, 5),
('GST 12%',  6,   6,   12),
('GST 18%',  9,   9,   18),
('GST 28%',  14,  14,  28)
ON DUPLICATE KEY UPDATE Tax_Name = VALUES(Tax_Name);

-- ─────────────────────────────────────────────────────────────
-- 3. HSN MASTER (linked to GST_Tax_Master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS HSN_Master (
    HSN_ID          INT AUTO_INCREMENT PRIMARY KEY,
    HSN_Code        VARCHAR(20)  NOT NULL UNIQUE,
    Description     VARCHAR(300) NOT NULL,
    GST_Tax_ID      INT          NULL,
    Is_Active       TINYINT(1)   DEFAULT 1,
    Created_Date    DATETIME     DEFAULT NOW(),
    FOREIGN KEY (GST_Tax_ID) REFERENCES GST_Tax_Master(GST_Tax_ID) ON DELETE SET NULL
);

-- Seed common HSN codes for barcode/thermal label business
INSERT INTO HSN_Master (HSN_Code, Description, GST_Tax_ID) VALUES
('48119200', 'Self-adhesive paper / labels (barcode labels)',        (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1)),
('48219000', 'Labels of all kinds, printed',                         (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 12%' LIMIT 1)),
('39199010', 'Self-adhesive film / BOPP labels',                    (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1)),
('84433100', 'Barcode printers / thermal transfer printers',        (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1)),
('84433200', 'Other printers, ink-jet / thermal',                   (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1)),
('84716010', 'POS terminals / barcode scanners',                    (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1)),
('39209919', 'Thermal rolls / POS rolls',                           (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1)),
('84713000', 'Portable computers / laptops',                        (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1)),
('84714900', 'Desktop computers / systems',                         (SELECT GST_Tax_ID FROM GST_Tax_Master WHERE Tax_Name='GST 18%' LIMIT 1))
ON DUPLICATE KEY UPDATE Description = VALUES(Description);

-- ─────────────────────────────────────────────────────────────
-- 4. UOM MASTER (Unit of Measure)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS UOM_Master (
    UOM_ID          INT AUTO_INCREMENT PRIMARY KEY,
    UOM_Code        VARCHAR(20)  NOT NULL UNIQUE,
    UOM_Name        VARCHAR(50)  NOT NULL,
    UOM_Type        VARCHAR(30)  DEFAULT 'Count',
    Is_Active       TINYINT(1)   DEFAULT 1,
    Created_Date    DATETIME     DEFAULT NOW()
);

INSERT INTO UOM_Master (UOM_Code, UOM_Name, UOM_Type) VALUES
('PCS',   'Pieces',       'Count'),
('ROLL',  'Roll',         'Count'),
('BOX',   'Box',          'Count'),
('CTN',   'Carton',       'Count'),
('SET',   'Set',          'Count'),
('PKT',   'Packet',       'Count'),
('MTR',   'Meter',        'Length'),
('KG',    'Kilogram',     'Weight'),
('GM',    'Gram',         'Weight'),
('LTR',   'Litre',        'Volume'),
('NOS',   'Numbers',      'Count'),
('UNIT',  'Unit',         'Count')
ON DUPLICATE KEY UPDATE UOM_Name = VALUES(UOM_Name);

-- ─────────────────────────────────────────────────────────────
-- 5. MANUFACTURERS MASTER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Manufacturers (
    Manufacturer_ID   INT AUTO_INCREMENT PRIMARY KEY,
    Manufacturer_Name VARCHAR(100) NOT NULL,
    Short_Code        VARCHAR(20)  NULL,
    Country           VARCHAR(50)  DEFAULT 'India',
    Contact_Person    VARCHAR(100) NULL,
    Mobile            VARCHAR(20)  NULL,
    Email             VARCHAR(100) NULL,
    Website           VARCHAR(150) NULL,
    Address           VARCHAR(300) NULL,
    Notes             VARCHAR(300) NULL,
    Is_Active         TINYINT(1)   DEFAULT 1,
    Created_Date      DATETIME     DEFAULT NOW()
);

INSERT INTO Manufacturers (Manufacturer_Name, Short_Code, Country) VALUES
('Zebra Technologies',    'ZEBRA',  'USA'),
('Honeywell',             'HONEY',  'USA'),
('TSC Auto ID',           'TSC',    'Taiwan'),
('Godex International',   'GODEX',  'Taiwan'),
('Brother Industries',    'BROTHER','Japan'),
('Epson India',           'EPSON',  'Japan'),
('HP India',              'HP',     'USA'),
('Lenovo India',          'LENOVO', 'China'),
('Dell India',            'DELL',   'USA'),
('Local Manufacturer',    'LOCAL',  'India')
ON DUPLICATE KEY UPDATE Manufacturer_Name = VALUES(Manufacturer_Name);

-- ─────────────────────────────────────────────────────────────
-- 6. EXTEND EXISTING HIERARCHY TABLES (if not already done)
-- ─────────────────────────────────────────────────────────────

-- Add Is_Active to item_groups if missing
ALTER TABLE item_groups
    MODIFY COLUMN Group_Name VARCHAR(100) NOT NULL,
    ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1;

-- Add Is_Active to item_subgroups if missing
ALTER TABLE item_subgroups
    ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1;

-- Add Is_Active to item_categories if missing
ALTER TABLE item_categories
    ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1;

-- Add Is_Active to item_subcategories if missing
ALTER TABLE item_subcategories
    ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1;

-- Add Is_Active to brands if missing
ALTER TABLE brands
    ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS Manufacturer_ID INT NULL;

-- ─────────────────────────────────────────────────────────────
-- 7. EXTEND ITEM_MASTER — Hardware + HSN/UOM links
-- ─────────────────────────────────────────────────────────────
ALTER TABLE Item_Master
    ADD COLUMN IF NOT EXISTS HSN_ID           INT          NULL COMMENT 'Link to HSN_Master',
    ADD COLUMN IF NOT EXISTS GST_Tax_ID       INT          NULL COMMENT 'Link to GST_Tax_Master',
    ADD COLUMN IF NOT EXISTS UOM_ID           INT          NULL COMMENT 'Link to UOM_Master',
    ADD COLUMN IF NOT EXISTS Manufacturer_ID  INT          NULL COMMENT 'Link to Manufacturers',
    ADD COLUMN IF NOT EXISTS Is_Hardware      TINYINT(1)   DEFAULT 0 COMMENT 'Is this a hardware item?',
    ADD COLUMN IF NOT EXISTS Serial_Required  TINYINT(1)   DEFAULT 0 COMMENT 'Requires serial number tracking',
    ADD COLUMN IF NOT EXISTS Warranty_Months  INT          DEFAULT 0 COMMENT 'Warranty period in months',
    ADD COLUMN IF NOT EXISTS AMC_Years        TINYINT(1)   DEFAULT 0 COMMENT 'Free AMC years (0/1/2/3)',
    ADD COLUMN IF NOT EXISTS Service_Applicable TINYINT(1) DEFAULT 0 COMMENT 'Service module applicable?',
    ADD COLUMN IF NOT EXISTS Model_No         VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS Part_No          VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS EAN_Code         VARCHAR(30)  NULL UNIQUE,
    ADD COLUMN IF NOT EXISTS Sale_Rate_Min    DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS Sale_Rate_Max    DECIMAL(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS Reorder_Qty      INT          DEFAULT 0;

-- Add FK references (ignore if already exist)
ALTER TABLE Item_Master
    ADD CONSTRAINT IF NOT EXISTS FK_Item_HSN FOREIGN KEY (HSN_ID) REFERENCES HSN_Master(HSN_ID) ON DELETE SET NULL,
    ADD CONSTRAINT IF NOT EXISTS FK_Item_GST FOREIGN KEY (GST_Tax_ID) REFERENCES GST_Tax_Master(GST_Tax_ID) ON DELETE SET NULL,
    ADD CONSTRAINT IF NOT EXISTS FK_Item_UOM FOREIGN KEY (UOM_ID) REFERENCES UOM_Master(UOM_ID) ON DELETE SET NULL,
    ADD CONSTRAINT IF NOT EXISTS FK_Item_Mfr FOREIGN KEY (Manufacturer_ID) REFERENCES Manufacturers(Manufacturer_ID) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- 8. MACHINE SERIAL MASTER (Hardware Serial Tracking)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Machine_Serial_Master (
    Serial_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Item_ID         INT          NOT NULL,
    Serial_No       VARCHAR(100) NOT NULL UNIQUE,
    Model_No        VARCHAR(100) NULL,
    Purchase_ID     INT          NULL COMMENT 'Link to Purchase',
    Sales_ID        INT          NULL COMMENT 'Link to Sales/Bill',
    Customer_ID     INT          NULL,
    Status          VARCHAR(20)  DEFAULT 'In Stock',
    Purchase_Date   DATE         NULL,
    Sale_Date       DATE         NULL,
    Warranty_Expiry DATE         NULL,
    AMC_Expiry      DATE         NULL,
    Location        VARCHAR(100) NULL,
    Notes           VARCHAR(300) NULL,
    Created_Date    DATETIME     DEFAULT NOW(),
    Updated_Date    DATETIME     DEFAULT NOW() ON UPDATE NOW(),
    CONSTRAINT chk_serial_status CHECK (Status IN ('In Stock','Sold','Service','Damaged','Returned')),
    FOREIGN KEY (Item_ID)     REFERENCES Item_Master(Item_ID) ON DELETE CASCADE,
    FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- 9. SERVICE RECORDS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Service_Records (
    Service_ID       INT AUTO_INCREMENT PRIMARY KEY,
    Serial_ID        INT          NOT NULL,
    Customer_ID      INT          NULL,
    Complaint_Date   DATE         NOT NULL DEFAULT (CURDATE()),
    Issue_Description TEXT        NOT NULL,
    Engineer_Name    VARCHAR(100) NULL,
    Status           VARCHAR(30)  DEFAULT 'Open',
    Diagnosed_Issue  TEXT         NULL,
    Parts_Used       VARCHAR(500) NULL,
    Parts_Cost       DECIMAL(10,2) DEFAULT 0,
    Labour_Charges   DECIMAL(10,2) DEFAULT 0,
    Total_Charges    DECIMAL(10,2) DEFAULT 0,
    Resolution_Notes TEXT         NULL,
    Closed_Date      DATE         NULL,
    Next_Service_Due DATE         NULL,
    Is_Under_Warranty TINYINT(1)  DEFAULT 0,
    Is_Under_AMC     TINYINT(1)   DEFAULT 0,
    Created_Date     DATETIME     DEFAULT NOW(),
    Updated_Date     DATETIME     DEFAULT NOW() ON UPDATE NOW(),
    CONSTRAINT chk_svc_status CHECK (Status IN ('Open','In Progress','Waiting Parts','Resolved','Closed','Cancelled')),
    FOREIGN KEY (Serial_ID)   REFERENCES Machine_Serial_Master(Serial_ID) ON DELETE RESTRICT,
    FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID)     ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────
-- 10. PURCHASE SERIAL LINK TABLE (batch serial entry on purchase)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Purchase_Serial_Entries (
    Entry_ID        INT AUTO_INCREMENT PRIMARY KEY,
    Purchase_ID     INT          NOT NULL,
    Item_ID         INT          NOT NULL,
    Serial_No       VARCHAR(100) NOT NULL,
    Serial_ID       INT          NULL COMMENT 'FK to Machine_Serial_Master after saved',
    Created_Date    DATETIME     DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_serial_item   ON Machine_Serial_Master(Item_ID);
CREATE INDEX IF NOT EXISTS idx_serial_cust   ON Machine_Serial_Master(Customer_ID);
CREATE INDEX IF NOT EXISTS idx_serial_status ON Machine_Serial_Master(Status);
CREATE INDEX IF NOT EXISTS idx_svc_serial    ON Service_Records(Serial_ID);
CREATE INDEX IF NOT EXISTS idx_svc_status    ON Service_Records(Status);
CREATE INDEX IF NOT EXISTS idx_hsn_code      ON HSN_Master(HSN_Code);

-- ─────────────────────────────────────────────────────────────
-- Done!
-- ─────────────────────────────────────────────────────────────
SELECT 'ERP Masters v5.0 upgrade complete!' AS Result;
