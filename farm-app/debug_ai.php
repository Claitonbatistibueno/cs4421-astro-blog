<?php
/* debug_ai.php - DIAGNÓSTICO DE ERRO */
echo "<h2>Diagnóstico de Integração Python</h2>";

// 1. Verifica se o arquivo existe
$script = __DIR__ . '/previsao_ia.py';
if (file_exists($script)) {
    echo "<p style='color:green'>✅ Arquivo Python encontrado em: $script</p>";
} else {
    die("<p style='color:red'>❌ ERRO: O arquivo previsao_ia.py não foi encontrado nesta pasta!</p>");
}

// 2. Tenta rodar e mostra o erro BRUTO
echo "<h3>Tentando executar...</h3>";
$command = "python \"$script\" 2>&1"; // 2>&1 força o erro a aparecer na tela
$output = shell_exec($command);

echo "<pre style='background:#eee; padding:10px; border:1px solid #ccc;'>";
if ($output) {
    echo $output;
} else {
    echo "Nenhum retorno (Isso geralmente significa que o Python não está no PATH do Windows/XAMPP)";
}
echo "</pre>";
?>