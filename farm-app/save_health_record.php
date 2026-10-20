<?php
// save_health_record.php - Backend API to save health data via AJAX
session_start();
require_once 'config.php';

header('Content-Type: application/json');

// Security Check
if (!isset($conn) || !isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized or DB error']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $animal_id = $_POST['animal_id'] ?? null;
    $item_id   = !empty($_POST['item_id']) ? $_POST['item_id'] : NULL;
    $date      = $_POST['treatment_date'] ?? date('Y-m-d');
    $vet       = $_POST['vet_name'] ?? '';
    $notes     = $_POST['diagnosis'] ?? '';

    if (!$animal_id) {
        echo json_encode(['success' => false, 'message' => 'Animal ID is required']);
        exit;
    }

    // 1. Get Cost and Manage Stock
    $cost = 0;
    if ($item_id) {
        $query = $conn->query("SELECT cost_price, stock_quantity, type FROM medical_catalog WHERE item_id = $item_id");
        if ($query && $row = $query->fetch_assoc()) {
            $cost = $row['cost_price'];
            
            // Deduct stock if it's a physical product (not a service)
            if ($row['type'] != 'service' && $row['stock_quantity'] > 0) {
                $conn->query("UPDATE medical_catalog SET stock_quantity = stock_quantity - 1 WHERE item_id = $item_id");
            }
        }
    }

    // 2. Insert Record
    $stmt = $conn->prepare("INSERT INTO health_records (animal_id, item_id, treatment_date, vet_name, diagnosis, cost) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iisssd", $animal_id, $item_id, $date, $vet, $notes, $cost);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Record saved successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    }
    $stmt->close();
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
?>