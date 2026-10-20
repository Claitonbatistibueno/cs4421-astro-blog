<?php
// API Historic helth JSON
require_once 'config.php';

if(isset($_GET['animal_id'])) {
    $id = intval($_GET['animal_id']);
    
    $sql = "SELECT h.*, m.item_name 
            FROM health_records h 
            LEFT JOIN medical_catalog m ON h.item_id = m.item_id 
            WHERE h.animal_id = $id 
            ORDER BY h.treatment_date DESC LIMIT 10";
            
    $result = $conn->query($sql);
    
    $data = [];
    while($row = $result->fetch_assoc()) {
        // Formata data para ficar bonito
        $row['treatment_date'] = date('d/m/Y', strtotime($row['treatment_date']));
        $data[] = $row;
    }
    
    echo json_encode($data);
}
?>