<?php
$hash = password_hash('Test@1234', PASSWORD_DEFAULT);
$pdo = new PDO('mysql:host=localhost;dbname=u153068796_easyshop_erp', 'u153068796_easyshop_erp', 'Mci8y@257');
$pdo->exec("UPDATE customer_master SET Portal_Password='$hash' WHERE Portal_Username='Vijay'");
echo "Done: $hash\n";
