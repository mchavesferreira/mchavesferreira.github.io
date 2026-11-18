<?php
/** API de leitura (PHP 8+, PDO + MySQL). Não publicar credenciais no repositório. */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}
try {
    $host = getenv('PEV_DB_HOST') ?: '127.0.0.1';
    $port = getenv('PEV_DB_PORT') ?: '3306';
    $db   = getenv('PEV_DB_NAME') ?: 'smartwaste';
    $user = getenv('PEV_DB_USER');
    $pass = getenv('PEV_DB_PASSWORD');
    if (!$user || $pass === false) throw new RuntimeException('Configuração do banco ausente');
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    $sql = 'SELECT id, name, address, lat, lng, level, capacity_l, battery, signal_dbm,
                   temperature_c, tilt, vibration, online, DATE_FORMAT(updated_at, "%Y-%m-%dT%H:%i:%s-03:00") AS updated_at
            FROM containers ORDER BY id';
    echo json_encode($pdo->query($sql)->fetchAll(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    error_log('PEV API: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Não foi possível consultar as unidades']);
}
