<?php
$hash = password_hash('Test@1234', PASSWORD_DEFAULT);
$pdo = new PDO('mysql:host=localhost;dbname=u153068796_easyshop_erp', 'u153068796_easyshop_erp', 'Mci8y@257');
$stmt = $pdo->prepare("UPDATE customer_master SET Portal_Password=? WHERE Portal_Username='Vijay'");
$stmt->execute([$hash]);
echo "Done: " . $hash . "\n";
