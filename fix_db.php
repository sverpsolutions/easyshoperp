<?php
$conn = new mysqli('localhost','u153068796_easyshop_erp','Mci8y@257','u153068796_easyshop_erp');
if ($conn->connect_error) { die(json_encode(['error'=>$conn->connect_error])); }
$res = [];

// Count employees
$c = $conn->query("SELECT COUNT(*) as c FROM `employees`")->fetch_assoc()['c'];
$res['before'] = (int)$c;

if ((int)$c == 0) {
    // Try PascalCase copy first
    $conn->query("INSERT IGNORE INTO `employees` SELECT * FROM `Employees`");
    $copied = $conn->affected_rows;
    if ($copied > 0) {
        $res['fix'] = "Copied $copied rows from Employees";
    } else {
        // Direct insert with hex-encoded password hashes
        $q = "INSERT INTO `employees`
(`Employee_ID`,`Name`,`Role`,`Mobile`,`Username`,`Password_Hash`,`Is_Active`,`Created_Date`,`Last_Login`,
 `Father_Name`,`Address`,`Aadhar_No`,`Join_Date`,`Monthly_Salary`,`Bank_Name`,`Bank_Account`,`Bank_IFSC`,
 `Advance_Limit_Monthly`,`Total_Advance_Balance`,`Emergency_Contact`,`Photo_Path`,`Resume_Path`,`Aadhar_Path`)
VALUES
(1,'Factory Owner','Owner','9999999999','owner',UNHEX('243279243130243777 6e4d5336437067527 14b68726259597554 4f37653778524c6f41 49415153774d4572 74 4e3248364864 6a47726a594466766e65'),1,'2026-04-03 14:27:19',NULL,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,5000.00,0.00,NULL,NULL,NULL,NULL)";
        // Hex approach won't work with spaces - use direct string instead
        $h1 = '$2y$10$7wnMS6CpgRqKhrbYYuTO7e7xRLoAIAQSwRMEtN2H6vDjGrjYDfvne';
        $h2 = '$2y$10$xhKv.0NPCl/I6yJ13npKjOiwyjyElKWQw9qknhywK2LpHc3z5yV9q';
        $h3 = '$2y$10$1WpnaQ.Ou5iHIIHw.Abbge215XD7KozinVnRC4HmdVL95HAmMQTqy';
        $stmt = $conn->prepare("INSERT INTO `employees`
(`Employee_ID`,`Name`,`Role`,`Mobile`,`Username`,`Password_Hash`,`Is_Active`,`Created_Date`,`Last_Login`,
 `Father_Name`,`Address`,`Aadhar_No`,`Join_Date`,`Monthly_Salary`,`Bank_Name`,`Bank_Account`,`Bank_IFSC`,
 `Advance_Limit_Monthly`,`Total_Advance_Balance`,`Emergency_Contact`,`Photo_Path`,`Resume_Path`,`Aadhar_Path`)
VALUES (?,?,?,?,?,?,?,?,?,NULL,NULL,NULL,NULL,0.00,NULL,NULL,NULL,5000.00,0.00,NULL,NULL,NULL,NULL)");
        $rows = [
            [1,'Factory Owner','Owner','9999999999','owner',$h1,1,'2026-04-03 14:27:19','2026-04-03 20:02:22'],
            [2,'Admin User','Admin','8888888888','admin',$h2,1,'2026-04-03 14:27:19','2026-04-03 11:24:01'],
            [3,'Ramkesh','Operator','111111111','Ramkesh',$h3,1,'2026-04-03 15:13:40','2026-04-03 19:47:43'],
        ];
        $inserted = 0;
        foreach ($rows as $row) {
            $stmt->bind_param('isssssis', $row[0],$row[1],$row[2],$row[3],$row[4],$row[5],$row[6],$row[7]);
            if ($stmt->execute()) $inserted++;
        }
        $res['fix'] = "Inserted $inserted rows via prepared statements";
        if ($inserted < 3) $res['stmt_error'] = $stmt->error;
    }
} else {
    $res['fix'] = "Already has $c rows, skipped";
}

// Verify
$rows = [];
$q = $conn->query("SELECT Employee_ID,Username,Role,LENGTH(Password_Hash) as hlen FROM `employees`");
while ($r = $q->fetch_assoc()) $rows[] = $r;
$res['employees'] = $rows;

// All table counts
$tables = ['employees','jobs','machines','settings','shifts','item_master','customer_master',
           'supplier_master','order_requests','job_requests','job_queue','job_production_log',
           'hourly_impressions','machine_log','roster','employee_attendance','audit_log'];
foreach ($tables as $t) {
    $r = $conn->query("SELECT COUNT(*) as c FROM `$t`");
    $res['counts'][$t] = $r ? (int)$r->fetch_assoc()['c'] : 'ERR:'.$conn->error;
}
$conn->close();
@unlink(__FILE__);
header('Content-Type: application/json');
echo json_encode($res, JSON_PRETTY_PRINT);
