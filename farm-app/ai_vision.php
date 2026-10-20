<?php
/* =========================================================
   ai_vision.php — AI Vision & Clinical Analysis
   Style: Premium Glass (Matching animal.php)
   ========================================================= */

session_start();
require_once 'config.php';

// Verificação de Segurança
if (!isset($conn)) { die("Erro de conexão com o banco de dados."); }
if (!isset($_SESSION['user_id'])) { header("Location: login.php"); exit; }

// Fetch active animals for the select dropdown
$animals = [];
$stmt = $conn->query("SELECT animal_id, tag_number, sex FROM animal WHERE status = 'active' ORDER BY animal_id DESC LIMIT 100");
if ($stmt) {
    while ($row = $stmt->fetch_assoc()) {
        $animals[] = $row;
    }
}

// --- INTEGRAÇÃO REAL COM A IA (PYTHON) ---
$ai_report = null;
$error_msg = null;

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 1. Coletar os dados do formulário
    $request_data = [
        'animal_id' => $_POST['animal_id'] ?? null,
        'temperature' => $_POST['temperature'] ?? null,
        'symptoms' => $_POST['symptoms'] ?? [],
        'observations' => $_POST['observations'] ?? '',
    ];

    // Lógica para upload de imagem (se houver)
    if (isset($_FILES['animal_image']) && $_FILES['animal_image']['error'] == 0) {
        $upload_dir = 'uploads/ai_vision/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        $filename = time() . '_' . basename($_FILES['animal_image']['name']);
        $target_path = $upload_dir . $filename;
        if (move_uploaded_file($_FILES['animal_image']['tmp_name'], $target_path)) {
            $request_data['image_path'] = $target_path;
        }
    }

    // 2. Salvar os dados em um arquivo JSON temporário
    $temp_json_file = 'temp_request_' . time() . '.json';
    file_put_contents($temp_json_file, json_encode($request_data));

    // 3. Executar o script Python (Com caminho absoluto para Windows)
    $python_path = 'C:\Users\clait\AppData\Local\Python\pythoncore-3.14-64\python.exe';
    $script_path = __DIR__ . '\veterinary_assistant.py';
    
    // O 2>&1 captura os erros do Python para o PHP conseguir ler
    $command = '"' . $python_path . '" "' . $script_path . '" "' . $temp_json_file . '" 2>&1';
    
    $python_output = shell_exec($command);

    // 4. Decodificar o JSON devolvido pelo Gemini
    if ($python_output) {
        // Trava de segurança: Extrai apenas a parte JSON da resposta
        $json_start = strpos($python_output, '{');
        $json_end = strrpos($python_output, '}');
        
        if ($json_start !== false && $json_end !== false) {
            $json_string = substr($python_output, $json_start, $json_end - $json_start + 1);
            $parsed_response = json_decode($json_string, true);
            
            if (isset($parsed_response['error'])) {
                $error_msg = "AI Engine Error: " . $parsed_response['error'];
            } else if (is_array($parsed_response)) {
                $ai_report = $parsed_response;
            } else {
                $error_msg = "Failed to parse AI response.";
            }
        } else {
            // Se não encontrou JSON, mostra o erro do Python na tela
            $error_msg = "Python Error: " . htmlspecialchars($python_output);
        }
    } else {
        $error_msg = "Failed to execute Python script. Output was completely empty.";
    }

    // 5. Limpar o arquivo temporário
    if (file_exists($temp_json_file)) {
        unlink($temp_json_file);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>AI Vision Analysis | Farm Project</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet">
    <style>
        /* ESTILOS PREMIUM GLASS */
        :root { --brand: #4ade80; --bg-dark: #05070a; --panel: rgba(20, 26, 38, 0.85); --border: rgba(255, 255, 255, 0.15); --text: #eaf1ff; --muted: #9fb0d0; --input-bg: rgba(255, 255, 255, 0.07); --ai-color: #a855f7; }
        
        body { background-color: var(--bg-dark); background-image: url('assets/img/dowloag.png'); background-size: cover; background-position: center; background-attachment: fixed; color: var(--text); font-family: "Segoe UI", sans-serif; overflow-x: hidden; }
        body::before { content: ""; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10, 15, 25, 0.8); z-index: -1; }
        
        .topbar { background: rgba(15, 23, 42, 0.95); padding: 0 40px; height: 64px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); backdrop-filter: blur(15px); position: sticky; top: 0; z-index: 1000; }
        .brand { font-size: 22px; font-weight: 700; color: var(--brand); display:flex; gap:10px; align-items:center; text-decoration: none; }
        .menu { display:flex; gap:15px; align-items:center; height: 100%; }
        .menu a.nav-link { color: var(--muted); text-decoration:none; display:flex; gap:8px; align-items:center; font-size:14px; transition:.2s; height: 100%; padding: 0 10px; }
        .menu a.nav-link:hover, .menu a.nav-link.active { color: var(--brand); }
        
        .dropdown { position: relative; display: flex; align-items: center; height: 100%; }
        .dropbtn { background: transparent; color: var(--muted); font-size: 14px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: inherit; transition: .2s; padding: 0 10px; height: 100%; }
        .dropdown:hover .dropbtn { color: var(--brand); }
        .dropdown-content { display: none; position: absolute; background-color: #1e293b; min-width: 230px; box-shadow: 0px 10px 30px rgba(0,0,0,0.8); border: 1px solid var(--border); border-radius: 12px; z-index: 1000; top: 100%; right: 0; padding: 8px 0; overflow: hidden; }
        .dropdown-content a { color: var(--text); padding: 12px 20px; text-decoration: none; display: flex; align-items: center; gap: 12px; font-size: 14px; transition: all 0.2s; }
        .dropdown-content a:hover { background-color: rgba(74, 222, 128, 0.1); color: var(--brand); padding-left: 25px; }
        .dropdown:hover .dropdown-content { display: block; }

        .main { padding: 40px; min-height: calc(100vh - 64px); max-width: 1400px; margin: 0 auto; }
        
        .form-control, .form-select { background: rgba(0, 0, 0, 0.3) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; color: #fff !important; border-radius: 8px; padding: 10px 12px; }
        .form-control:focus, .form-select:focus { background: rgba(0, 0, 0, 0.5) !important; border-color: var(--ai-color) !important; box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2); }
        .form-control::placeholder { color: rgba(255, 255, 255, 0.4); }
        label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 5px; font-weight: 600; }

        .custom-card { background: rgba(20, 26, 38, 0.6); backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: 20px; padding: 25px; }
        
        .btn-ai { background: var(--ai-color); color: #fff; border: none; border-radius: 8px; font-weight: 700; padding: 12px 24px; transition: .2s; }
        .btn-ai:hover { background: #9333ea; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(168, 85, 247, 0.4); color: white; }

        .ai-result-box { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); }
        .ai-text-purple { color: #d8b4fe; }
    </style>
</head>
<body>

<header class="topbar">
    <a href="dashboard.php" class="brand"><i class="fa-solid fa-tractor"></i> Farm Project</a>
    
    <nav class="menu">
        <a href="dashboard.php" class="nav-link"><i class="fa-solid fa-house"></i> Overview</a>
        <a href="animal.php" class="nav-link"><i class="fa-solid fa-cow"></i> Animals</a>
        <a href="feeding.php" class="nav-link"><i class="fa-solid fa-bucket"></i> Feeding</a>
        <a href="weighing.php" class="nav-link"><i class="fa-solid fa-scale-balanced"></i> Weighing</a>
        <a href="financial_dashboard.php" class="nav-link"><i class="fa-solid fa-coins"></i> Financial</a>
        <a href="ai_vision.php" class="nav-link active" style="color: var(--ai-color);"><i class="fa-solid fa-brain"></i> AI Assistant</a>
        
        <div class="dropdown">
            <button class="dropbtn"><i class="fa-solid fa-chart-pie"></i> Reports <i class="fa-solid fa-caret-down"></i></button>
            <div class="dropdown-content">
                <a href="reports_animals.php"><i class="fa-solid fa-cow"></i> Animal Reports</a>
                <a href="reports_weight.php"><i class="fa-solid fa-weight-scale"></i> Weight Control</a>
                <a href="reports_health.php"><i class="fa-solid fa-heart-pulse"></i> Health & Medical</a>
            </div>
        </div>
    </nav>
</header>

<div class="main container-fluid">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h2><i class="fa-solid fa-brain" style="color: var(--ai-color);"></i> AI Clinical Assistant</h2>
    </div>

    <?php if ($error_msg): ?>
        <div class="alert alert-danger" style="background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5;">
            <i class="fas fa-exclamation-triangle"></i> <?= nl2br(htmlspecialchars($error_msg)) ?>
        </div>
    <?php endif; ?>

    <div class="row g-4">
        <div class="col-lg-4">
            <div class="custom-card h-100" style="border-top: 4px solid var(--ai-color);">
                <h5 class="mb-4 text-white"><i class="fas fa-edit"></i> Clinical Input</h5>
                
                <form action="<?= htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post" enctype="multipart/form-data">
                    <div class="mb-3">
                        <label>Select Animal</label>
                        <select name="animal_id" class="form-select" required>
                            <option value="">-- Choose an animal --</option>
                            <?php foreach ($animals as $a): ?>
                                <option value="<?= $a['animal_id'] ?>">Tag: <?= htmlspecialchars($a['tag_number']) ?> (<?= ucfirst($a['sex']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label>Body Temperature (°C)</label>
                        <input type="number" step="0.1" name="temperature" class="form-control" placeholder="e.g. 39.5" required>
                    </div>

                    <div class="mb-3">
                        <label>Observed Symptoms</label>
                        <div class="row g-2">
                            <div class="col-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="sym1" name="symptoms[]" value="lameness">
                                    <label class="form-check-label text-white text-lowercase" for="sym1">Lameness</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="sym2" name="symptoms[]" value="lethargy">
                                    <label class="form-check-label text-white text-lowercase" for="sym2">Lethargy</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="sym3" name="symptoms[]" value="coughing">
                                    <label class="form-check-label text-white text-lowercase" for="sym3">Coughing</label>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="sym4" name="symptoms[]" value="diarrhea">
                                    <label class="form-check-label text-white text-lowercase" for="sym4">Diarrhea</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="sym5" name="symptoms[]" value="anorexia">
                                    <label class="form-check-label text-white text-lowercase" for="sym5">Anorexia</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="sym6" name="symptoms[]" value="swelling">
                                    <label class="form-check-label text-white text-lowercase" for="sym6">Swelling</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label>Free Observations</label>
                        <textarea name="observations" class="form-control" rows="3" placeholder="Describe behavior, lesions, timeline..."></textarea>
                    </div>

                    <button type="submit" class="btn btn-ai w-100 mt-2">
                        <i class="fas fa-magic"></i> Generate AI Analysis
                    </button>
                </form>
            </div>
        </div>

        <div class="col-lg-8">
            <div class="custom-card h-100">
                <?php if ($ai_report): ?>
                    
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h4 class="m-0" style="color: var(--ai-color);"><i class="fas fa-laptop-medical"></i> Diagnostic Report</h4>
                        <span class="badge" style="background: rgba(255,255,255,0.1); border: 1px solid var(--border); padding: 8px 12px;">
                            Confidence: <?= htmlspecialchars($ai_report['confidence'] ?? 'Unknown') ?>
                        </span>
                    </div>

                    <div class="ai-result-box mb-4">
                        <h6 class="ai-text-purple"><i class="fas fa-file-medical-alt"></i> Clinical Summary</h6>
                        <p class="mb-0 text-white" style="font-size: 15px;"><?= htmlspecialchars($ai_report['summary'] ?? '') ?></p>
                    </div>

                    <div class="row g-4 mb-4">
                        <div class="col-md-6">
                            <h6 class="ai-text-purple"><i class="fas fa-microscope"></i> Probable Hypotheses</h6>
                            <div class="ai-result-box">
                                <?php if(isset($ai_report['hypotheses']) && is_array($ai_report['hypotheses'])): ?>
                                    <?php foreach ($ai_report['hypotheses'] as $hyp): ?>
                                        <div class="mb-3 last-mb-0">
                                            <div class="d-flex justify-content-between mb-1">
                                                <span class="text-white text-sm fw-bold"><?= htmlspecialchars($hyp['name']) ?></span>
                                                <span class="text-white-50 text-sm"><?= $hyp['prob'] ?>%</span>
                                            </div>
                                            <div class="progress" style="height: 6px; background: rgba(0,0,0,0.5);">
                                                <div class="progress-bar" style="width: <?= $hyp['prob'] ?>%; background: var(--ai-color);"></div>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <h6 class="ai-text-purple"><i class="fas fa-project-diagram"></i> Physiological Justification</h6>
                            <div class="ai-result-box h-100 text-white-50" style="font-size: 14px;">
                                <?= htmlspecialchars($ai_report['justification'] ?? '') ?>
                            </div>
                        </div>
                    </div>

                    <div class="row g-4 mb-4">
                        <div class="col-md-6">
                            <h6 class="text-success"><i class="fas fa-check-circle"></i> Safe Immediate Actions</h6>
                            <ul class="text-white-50 mt-2 ps-3">
                                <?php if(isset($ai_report['safe_actions'])): ?>
                                    <?php foreach ($ai_report['safe_actions'] as $action): ?>
                                        <li class="mb-1"><?= htmlspecialchars($action) ?></li>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </ul>
                        </div>
                        
                        <div class="col-md-6">
                            <h6 class="text-danger"><i class="fas fa-exclamation-triangle"></i> Severe Warning Signs</h6>
                            <ul class="text-white-50 mt-2 ps-3">
                                <?php if(isset($ai_report['warnings'])): ?>
                                    <?php foreach ($ai_report['warnings'] as $warning): ?>
                                        <li class="mb-1"><?= htmlspecialchars($warning) ?></li>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </ul>
                        </div>
                    </div>

                    <hr style="border-color: rgba(255,255,255,0.1);">

                    <div class="mt-3">
                        <h6 class="ai-text-purple"><i class="fas fa-book-medical"></i> Scientific References & Questions</h6>
                        <ul class="text-white-50 text-sm ps-3 mb-3">
                            <?php if(isset($ai_report['references'])): ?>
                                <?php foreach ($ai_report['references'] as $ref): ?>
                                    <li><?= htmlspecialchars($ref) ?></li>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </ul>
                        
                        <h6 class="ai-text-purple"><i class="fas fa-question-circle"></i> Questions for User</h6>
                        <ul class="text-white-50 text-sm ps-3">
                            <?php if(isset($ai_report['questions'])): ?>
                                <?php foreach ($ai_report['questions'] as $q): ?>
                                    <li><em><?= htmlspecialchars($q) ?></em></li>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </ul>
                    </div>

                <?php else: ?>
                    <div class="d-flex flex-column align-items-center justify-content-center h-100 text-center" style="opacity: 0.5;">
                        <i class="fas fa-robot fa-4x mb-3" style="color: var(--ai-color);"></i>
                        <h4 class="text-white">Awaiting Input</h4>
                        <p class="text-white-50">Fill out the clinical input form and click generate to see the AI analysis here.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>