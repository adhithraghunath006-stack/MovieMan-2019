<?php
// ═══════════════════════════════════════════════════════
// MovieMan 2019 — Executive Watchlist Cloud Interface
// ═══════════════════════════════════════════════════════

require_once __DIR__ . '/../database.php';

$userId = $_SESSION['user_id'] ?? null;
$sessionId = $_SESSION['session_id'] ?? session_id();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        // Fetch matching logged user data or session guest items
        if ($userId) {
            $watchlist = Database::fetchAll("SELECT movie_id, title, poster_path, rating, year, collection FROM watchlist WHERE user_id = ? ORDER BY added_at DESC", [$userId]);
        } else {
            $watchlist = Database::fetchAll("SELECT movie_id, title, poster_path, rating, year, collection FROM watchlist WHERE session_id = ? AND user_id IS NULL ORDER BY added_at DESC", [$sessionId]);
        }
        echo json_encode(["status" => "success", "data" => $watchlist]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $movieId = $data['movie_id'] ?? null;
    $title = $data['movie_title'] ?? '';
    $poster = $data['poster_path'] ?? '';
    $rating = $data['rating'] ?? '—';
    $year = $data['year'] ?? '';
    $collection = $data['collection'] ?? 'watchlist';

    if (!$movieId) {
        echo json_encode(["status" => "error", "message" => "Invalid movie record target."]);
        exit;
    }

    try {
        Database::query(
            "INSERT INTO watchlist (user_id, session_id, movie_id, title, poster_path, rating, year, collection, added_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE title = VALUES(title), poster_path = VALUES(poster_path), rating = VALUES(rating), year = VALUES(year)",
            [$userId, $sessionId, $movieId, $title, $poster, $rating, $year, $collection]
        );
        echo json_encode(["status" => "success", "message" => "Collection synced successfully."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Database Update Drop: " . $e->getMessage()]);
    }
} 
elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents("php://input"), true);
    $movieId = $data['movie_id'] ?? null;

    try {
        if ($movieId) {
            if ($userId) {
                Database::execute("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?", [$userId, $movieId]);
            } else {
                Database::execute("DELETE FROM watchlist WHERE session_id = ? AND movie_id = ? AND user_id IS NULL", [$sessionId, $movieId]);
            }
            echo json_encode(["status" => "success", "message" => "Movie dropped cleanly."]);
        } else {
            // Wipe entire set tracking container mapping
            if ($userId) {
                Database::execute("DELETE FROM watchlist WHERE user_id = ?", [$userId]);
            } else {
                Database::execute("DELETE FROM watchlist WHERE session_id = ? AND user_id IS NULL", [$sessionId]);
            }
            echo json_encode(["status" => "success", "message" => "Collection wiped perfectly."]);
        }
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
}