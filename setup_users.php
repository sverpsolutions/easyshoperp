<?php
/**
 * ONE-TIME SETUP — Creates/updates Owner & Admin users with real passwords.
 * Run once: http://localhost/quraisherp/setup_users.php
 * DELETE this file after running!
 */

$host = 'localhost';
$db   = 'BarcodeMES';
$user = 'root';
$pass = '';   // change if your MySQL root has a password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    die('<b style="color:red">DB connect failed:</b> ' . $e->getMessage());
}

$users = [
    ['name' => 'Factory Owner', 'role' => 'Owner', 'mobile' => '9999999999', 'username' => 'owner', 'password' => 'Admin@123'],
    ['name' => 'Admin User',    'role' => 'Admin', 'mobile' => '8888888888', 'username' => 'admin', 'password' => 'Admin@123'],
];

echo '<h2 style="font-family:sans-serif">Barcode MES — User Setup</h2><pre>';

foreach ($users as $u) {
    $hash = password_hash($u['password'], PASSWORD_DEFAULT);

    // Check if username exists
    $stmt = $pdo->prepare('SELECT Employee_ID FROM Employees WHERE Username = ?');
    $stmt->execute([$u['username']]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        $pdo->prepare('UPDATE Employees SET Password_Hash=?, Name=?, Mobile=?, Is_Active=1 WHERE Username=?')
            ->execute([$hash, $u['name'], $u['mobile'], $u['username']]);
        echo "✅ Updated: {$u['username']} (ID: $existing)\n";
    } else {
        $pdo->prepare('INSERT INTO Employees (Name,Role,Mobile,Username,Password_Hash) VALUES (?,?,?,?,?)')
            ->execute([$u['name'], $u['role'], $u['mobile'], $u['username'], $hash]);
        $id = $pdo->lastInsertId();
        echo "✅ Created: {$u['username']} (ID: $id)\n";
    }
    echo "   Username : {$u['username']}\n";
    echo "   Password : {$u['password']}\n";
    echo "   Role     : {$u['role']}\n\n";
}

echo '</pre>';
echo '<p style="font-family:sans-serif;color:red"><b>⚠️  DELETE this file now!</b> It is a security risk.</p>';
echo '<p style="font-family:sans-serif"><a href="http://localhost/quraisherp/">Go to app →</a></p>';
