<?php
include_once 'config.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $tag = $_POST['tag_number'];
    $sex = $_POST['sex'];
    $country_id = $_POST['country_id'];
    $status = $_POST['status'];
    // O type_id é obrigatório no seu SQL, aqui um exemplo fixo como 1
    $type_id = 1; 

    $sql = "INSERT INTO animal (tag_number, type_id, country_id, sex, status) 
            VALUES ('$tag', '$type_id', '$country_id', '$sex', '$status')";

    if ($conn->query($sql) === TRUE) {
        echo "Animal registrado com sucesso!";
        echo "<br><a href='index.html'>Voltar</a>";
    } else {
        echo "Erro: " . $sql . "<br>" . $conn->error;
    }
}
$conn->close();
?>