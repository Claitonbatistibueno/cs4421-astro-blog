<?php
$host = "localhost";
$user = "root";
$pass = "";
$dbname = "farmproject";

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
// Do not close the connection here
?>