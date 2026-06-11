<?php
// ═══════════════════════════════════════════════════════
// MovieMan 2019 — Executive User Tracking Search Logs
// ═══════════════════════════════════════════════════════

require_once __DIR__ . '/../database.php';

$userId = $_SESSION['user_id'] ?? null;
$sessionId = $_SESSION['session_id'] ?? session_id();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        if ($userId) {
            $history = Database::fetchAll("SELECT DISTINCT query, searched_at FROM search_history WHERE user_id = ? ORDER BY searched_at DESC LIMIT 10", [$userId]);
        } else {
            $history = Database::fetchAll("SELECT DISTINCT query, searched_at FROM search_history WHERE session_id = ? AND user_id IS NULL ORDER BY searched_at DESC LIMIT 10", [$sessionId]);
        }
        echo json_encode(["status" => "success", "data" => $history]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $query = trim($data['query'] ?? '');

    if (empty($query)) {
        echo json_encode(["status" => "error", "message" => "Query content string is blank."]);
        exit;
    }

    try {
        // Safe check to avoid database constraint locks during active tracking
        if ($userId) {
            Database::query(
                "INSERT INTO search_history (user_id, session_id, query, searched_at) VALUES (?, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE searched_at = NOW()",
                [$userId, $sessionId, $query]
            );
        } else {
            Database::query(
                "INSERT INTO search_history (user_id, session_id, query, searched_at) VALUES (NULL, ?, ?, NOW()) 
                 ON DUPLICATE KEY UPDATE searched_at = NOW()",
                [$sessionId, $query]
            );
        }
        echo json_encode(["status" => "success"]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}