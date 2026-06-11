<?php
// ═══════════════════════════════════════════════════════
// MovieMan 2019 — Complete Executive Login Script
// ═══════════════════════════════════════════════════════

require_once __DIR__ . '/../database.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── 1. GET Request: Initial Load Session Validator ──
if ($method === 'GET') {
    if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
        echo json_encode([
            "status" => "success",
            "user" => [
                "id" => $_SESSION['user_id'],
                "username" => $_SESSION['username']
            ]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "No active session logged."]);
    }
    exit;
}

// ── 2. DELETE Request: Secure Session Destroyer (Sign Out) ──
if ($method === 'DELETE') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    echo json_encode(["status" => "success", "message" => "Logged out securely."]);
    exit;
}

// ── 3. POST Request: Standard authentication check ──
if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $username = trim($data['username'] ?? '');
    $password = trim($data['password'] ?? '');

    if (empty($username) || empty($password)) {
        echo json_encode(["status" => "error", "message" => "Username and password are required!"]);
        exit;
    }

    try {
        // Safe static call query alignment
        $user = Database::fetchOne("SELECT * FROM users WHERE username = ?", [$username]);

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];

            echo json_encode([
                "status" => "success",
                "message" => "Login successful!",
                "user" => ["id" => $user['id'], "username" => $user['username']]
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid username or password!"]);
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Auth Processing Error: " . $e->getMessage()]);
    }
    exit;
}