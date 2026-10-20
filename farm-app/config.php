<?php
$host = (getenv('DB_HOST') ?: 'localhost');
$user = (getenv('DB_USER') ?: 'root');
$pass = (getenv('DB_PASS') ?: '');
$dbname = (getenv('DB_NAME') ?: 'farmproject');

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
// Do not close the connection here
?>