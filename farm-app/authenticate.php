<?php
// - Authenticate.php
require_once 'config.php';
session_start();

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user = $_POST['username'] ?? '';
    $pass = $_POST['password'] ?? '';
    $code = $_POST['login_code'] ?? '';

    // Match these names to the SQL table we just created
    $stmt = $conn->prepare("SELECT user_id, password FROM users WHERE username = ? AND login_code = ?");
    
    if ($stmt === false) {
        die("DATABASE ERROR: " . $conn->error);
    }

    $stmt->bind_param("ss", $user, $code);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        // Checking plain text password
        if ($pass === $row['password']) {
            $_SESSION['user_id'] = $row['user_id'];
            $_SESSION['username'] = $user;
            header("Location: dashboard.php");
            exit();
        } else {
            echo "<script>alert('Invalid Password!'); window.location='login.html';</script>";
        }
    } else {
        echo "<script>alert('User or Login Code not found!'); window.location='login.html';</script>";
    }
}
?>