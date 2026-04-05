<?php
/**
 * ERP v5 Masters — Database Migration Runner
 * Upload this file to public_html/ then visit:
 *   https://easyshoperp.sverpsolutions.com/run_migration_v5.php?key=erp_migrate_v5_2025
 * DELETE this file immediately after migration!
 */

// Security key
if (($_GET['key'] ?? '') !== 'erp_migrate_v5_2025') {
    http_response_code(403);
    die('Forbidden');
}

// DB Config — matches your CI3 database.php
$host = 'localhost';
$user = 'u153068796_easyshop_erp';
$pass = 'Mci8y@257';
$db   = 'u153068796_easyshop_erp';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die('<pre style="color:red">Connection failed: ' . $conn->connect_error . '</pre>');
}
$conn->set_charset('utf8mb4');

echo '<html><head><title>ERP v5 Migration</title></head><body>';
echo '<h2 style="font-family:monospace">ERP v5 Masters — Database Migration</h2>';
echo '<pre style="font-family:monospace;font-size:13px;">';

// ── Migration SQL statements (split manually for mysqli) ──
$statements = [

    // ── 1. COMPANY MASTER ────────────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS Company_Master (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    // ── 2. GST TAX MASTER ────────────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS GST_Tax_Master (
        GST_Tax_ID  INT AUTO_INCREMENT PRIMARY KEY,
        Tax_Name    VARCHAR(50)  NOT NULL,
        CGST_Pct    DECIMAL(5,2) DEFAULT 0,
        SGST_Pct    DECIMAL(5,2) DEFAULT 0,
        IGST_Pct    DECIMAL(5,2) DEFAULT 0,
        Total_Pct   DECIMAL(5,2) GENERATED ALWAYS AS (CGST_Pct + SGST_Pct) STORED,
        Is_Active   TINYINT(1)   DEFAULT 1,
        Created_Date DATETIME    DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "INSERT IGNORE INTO GST_Tax_Master (GST_Tax_ID, Tax_Name, CGST_Pct, SGST_Pct, IGST_Pct) VALUES
        (1, 'GST 0%',   0,   0,   0),
        (2, 'GST 5%',   2.5, 2.5, 5),
        (3, 'GST 12%',  6,   6,   12),
        (4, 'GST 18%',  9,   9,   18),
        (5, 'GST 28%',  14,  14,  28)",

    // ── 3. HSN MASTER ────────────────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS HSN_Master (
        HSN_ID      INT AUTO_INCREMENT PRIMARY KEY,
        HSN_Code    VARCHAR(20)  NOT NULL UNIQUE,
        Description VARCHAR(300) NOT NULL,
        GST_Tax_ID  INT          NULL,
        Is_Active   TINYINT(1)   DEFAULT 1,
        Created_Date DATETIME    DEFAULT NOW(),
        FOREIGN KEY (GST_Tax_ID) REFERENCES GST_Tax_Master(GST_Tax_ID) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "INSERT IGNORE INTO HSN_Master (HSN_Code, Description, GST_Tax_ID) VALUES
        ('48119200', 'Self-adhesive paper / barcode labels',            4),
        ('48219000', 'Labels of all kinds, printed',                    3),
        ('39199010', 'Self-adhesive film / BOPP labels',               4),
        ('84433100', 'Barcode printers / thermal transfer printers',   4),
        ('84433200', 'Other printers, ink-jet / thermal',             4),
        ('84716010', 'POS terminals / barcode scanners',              4),
        ('39209919', 'Thermal rolls / POS rolls',                      4),
        ('84713000', 'Portable computers / laptops',                   4),
        ('84714900', 'Desktop computers / systems',                    4)",

    // ── 4. UOM MASTER ────────────────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS UOM_Master (
        UOM_ID      INT AUTO_INCREMENT PRIMARY KEY,
        UOM_Code    VARCHAR(20)  NOT NULL UNIQUE,
        UOM_Name    VARCHAR(50)  NOT NULL,
        UOM_Type    VARCHAR(30)  DEFAULT 'Count',
        Is_Active   TINYINT(1)   DEFAULT 1,
        Created_Date DATETIME    DEFAULT NOW()
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "INSERT IGNORE INTO UOM_Master (UOM_Code, UOM_Name, UOM_Type) VALUES
        ('PCS','Pieces','Count'), ('ROLL','Roll','Count'), ('BOX','Box','Count'),
        ('CTN','Carton','Count'), ('SET','Set','Count'), ('PKT','Packet','Count'),
        ('MTR','Meter','Length'), ('KG','Kilogram','Weight'), ('GM','Gram','Weight'),
        ('LTR','Litre','Volume'), ('NOS','Numbers','Count'), ('UNIT','Unit','Count')",

    // ── 5. MANUFACTURERS ─────────────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS Manufacturers (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    "INSERT IGNORE INTO Manufacturers (Manufacturer_Name, Short_Code, Country) VALUES
        ('Zebra Technologies','ZEBRA','USA'),('Honeywell','HONEY','USA'),
        ('TSC Auto ID','TSC','Taiwan'),('Godex International','GODEX','Taiwan'),
        ('Brother Industries','BROTHER','Japan'),('Epson India','EPSON','Japan'),
        ('HP India','HP','USA'),('Lenovo India','LENOVO','China'),
        ('Dell India','DELL','USA'),('Local Manufacturer','LOCAL','India')",

    // ── 6. ALTER HIERARCHY TABLES ────────────────────────────────────────────
    "ALTER TABLE item_groups
        MODIFY COLUMN Group_Name VARCHAR(100) NOT NULL",

    "ALTER TABLE item_groups
        ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1",

    "ALTER TABLE item_subgroups
        ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1",

    "ALTER TABLE item_categories
        ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1",

    "ALTER TABLE item_subcategories
        ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1",

    "ALTER TABLE brands
        ADD COLUMN IF NOT EXISTS Is_Active TINYINT(1) DEFAULT 1",

    "ALTER TABLE brands
        ADD COLUMN IF NOT EXISTS Manufacturer_ID INT NULL",

    // ── 7. EXTEND ITEM_MASTER ────────────────────────────────────────────────
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS HSN_ID           INT          NULL",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS GST_Tax_ID       INT          NULL",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS UOM_ID           INT          NULL",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS Manufacturer_ID  INT          NULL",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS Is_Hardware      TINYINT(1)   DEFAULT 0",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS Serial_Required  TINYINT(1)   DEFAULT 0",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS Warranty_Months  INT          DEFAULT 0",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS AMC_Years        TINYINT(1)   DEFAULT 0",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS Service_Applicable TINYINT(1) DEFAULT 0",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS Model_No         VARCHAR(100) NULL",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS Part_No          VARCHAR(100) NULL",
    "ALTER TABLE Item_Master
        ADD COLUMN IF NOT EXISTS EAN_Code         VARCHAR(30)  NULL",

    // ── 8. MACHINE SERIAL MASTER ─────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS Machine_Serial_Master (
        Serial_ID       INT AUTO_INCREMENT PRIMARY KEY,
        Item_ID         INT          NOT NULL,
        Serial_No       VARCHAR(100) NOT NULL UNIQUE,
        Model_No        VARCHAR(100) NULL,
        Purchase_ID     INT          NULL,
        Sales_ID        INT          NULL,
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
        FOREIGN KEY (Item_ID)     REFERENCES Item_Master(Item_ID) ON DELETE CASCADE,
        FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    // ── 9. SERVICE RECORDS ───────────────────────────────────────────────────
    "CREATE TABLE IF NOT EXISTS Service_Records (
        Service_ID        INT AUTO_INCREMENT PRIMARY KEY,
        Serial_ID         INT          NOT NULL,
        Customer_ID       INT          NULL,
        Complaint_Date    DATE         NOT NULL,
        Issue_Description TEXT         NOT NULL,
        Engineer_Name     VARCHAR(100) NULL,
        Status            VARCHAR(30)  DEFAULT 'Open',
        Diagnosed_Issue   TEXT         NULL,
        Parts_Used        VARCHAR(500) NULL,
        Parts_Cost        DECIMAL(10,2) DEFAULT 0,
        Labour_Charges    DECIMAL(10,2) DEFAULT 0,
        Total_Charges     DECIMAL(10,2) DEFAULT 0,
        Resolution_Notes  TEXT         NULL,
        Closed_Date       DATE         NULL,
        Next_Service_Due  DATE         NULL,
        Is_Under_Warranty TINYINT(1)   DEFAULT 0,
        Is_Under_AMC      TINYINT(1)   DEFAULT 0,
        Created_Date      DATETIME     DEFAULT NOW(),
        Updated_Date      DATETIME     DEFAULT NOW() ON UPDATE NOW(),
        FOREIGN KEY (Serial_ID)   REFERENCES Machine_Serial_Master(Serial_ID) ON DELETE RESTRICT,
        FOREIGN KEY (Customer_ID) REFERENCES Customer_Master(Customer_ID)     ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

    // ── 10. DEFAULT COMPANY RECORD ───────────────────────────────────────────
    "INSERT INTO Company_Master (Company_Name, GSTIN, Theme_Color)
     SELECT 'EasyShop Marketing Pvt Ltd', '07AABCE1234F1Z5', '#2563eb'
     WHERE NOT EXISTS (SELECT 1 FROM Company_Master LIMIT 1)",
];

$ok = 0; $fail = 0;
foreach ($statements as $i => $sql) {
    $short = substr(trim($sql), 0, 80);
    if ($conn->query($sql) === TRUE) {
        echo "✅ [" . ($i+1) . "] " . $short . "…\n";
        $ok++;
    } else {
        $err = $conn->error;
        // Ignore "Duplicate column" — column already exists
        if (strpos($err, 'Duplicate column') !== false || strpos($err, 'already exists') !== false) {
            echo "⚠️  [" . ($i+1) . "] Already exists — skip: " . $short . "…\n";
            $ok++;
        } else {
            echo "❌ [" . ($i+1) . "] FAILED: " . $err . "\n    SQL: " . $short . "\n";
            $fail++;
        }
    }
}

$conn->close();
echo "\n\n";
echo "══════════════════════════════════════════════\n";
echo "Migration complete: {$ok} OK, {$fail} FAILED\n";
echo "══════════════════════════════════════════════\n";
echo '</pre>';
echo '<p style="color:red;font-family:monospace;font-weight:bold">⚠️ DELETE this file from server immediately after migration!</p>';
echo '</body></html>';
