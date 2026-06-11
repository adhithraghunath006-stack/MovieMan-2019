<?php
// ═══════════════════════════════════════════════════════
// MovieMan 2019 — Complete Executive Register Script
// ═══════════════════════════════════════════════════════

require_once __DIR__ . '/../database.php';
// Handle CORS preflight options check
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["status" => "error", "message" => "Invalid Request Method"]);
    exit;
}

// Get JSON input post payload cleanly
$data = json_decode(file_get_contents("php://input"), true);

$username = trim($data['username'] ?? '');
$email    = trim($data['email'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($username) || empty($email) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "All fields are required!"]);
    exit;
}

try {
    // Upgraded static implementation matching final api/database.php wrapper
    $stmt = Database::query("SELECT id FROM users WHERE username = ? OR email = ?", [$username, $email]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(["status" => "error", "message" => "Username or Email already registered!"]);
        exit;
    }

    // Secure Password Hashing via BCRYPT standard pipeline
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // Standard Direct Query mapping the exact layout from final schema.sql
    Database::query(
        "INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())",
        [$username, $email, $hashedPassword]
    );

    echo json_encode(["status" => "success", "message" => "Registration successful! You can now log in."]);

} catch (PDOException $e) {
    // Emits strict system exception warnings transparently if database integrity fails
    echo json_encode(["status" => "error", "message" => "Database Connection Drop: " . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Pipeline Failure: " . $e->getMessage()]);
}