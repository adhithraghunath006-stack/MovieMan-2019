<?php
// ═══════════════════════════════════════════════════════
// MovieMan 2019 — API Endpoint Router
// Handles all /api/*.php requests
// ═══════════════════════════════════════════════════════

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/TMDbService.php';

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function respond(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error(string $msg, int $code = 400): void {
    respond(['error' => $msg], $code);
}

// Parse route
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$parts  = array_filter(explode('/', trim($uri, '/')));
$parts  = array_values($parts);

// Find 'endpoints' segment
$idx      = array_search('endpoints', $parts);
$resource = $parts[$idx + 1] ?? '';
$id       = $parts[$idx + 2] ?? null;

try {
    switch ($resource) {

        // ── TMDb proxy routes ─────────────────────────
        case 'trending':
            $type   = $_GET['type']   ?? 'movie';
            $window = $_GET['window'] ?? 'week';
            respond(TMDbService::trending($type, $window));
            break;

        case 'now-playing':
            respond(TMDbService::nowPlaying((int)($_GET['page'] ?? 1)));
            break;

        case 'top-rated':
            respond(TMDbService::topRated((int)($_GET['page'] ?? 1)));
            break;

        case 'upcoming':
            respond(TMDbService::upcoming((int)($_GET['page'] ?? 1)));
            break;

        case 'movie':
            if (!$id) error('Movie ID required');
            respond(TMDbService::movieDetail((int)$id, $_GET['append'] ?? 'credits,videos,keywords'));
            break;

        case 'tv':
            if (!$id) error('TV ID required');
            respond(TMDbService::tvDetail((int)$id));
            break;

        case 'discover':
            $params = array_filter([
                'with_genres'              => $_GET['genres']   ?? '',
                'with_original_language' => $_GET['lang']     ?? '',
                'sort_by'                => $_GET['sort']      ?? 'popularity.desc',
                'page'                   => (int)($_GET['page'] ?? 1),
                'vote_count.gte'         => 20,
                'primary_release_date.gte' => $_GET['year_from'] ?? '',
                'primary_release_date.lte' => $_GET['year_to']   ?? '',
            ]);
            respond(TMDbService::discover(array_filter($params)));
            break;

        case 'search':
            $q    = $_GET['q'] ?? '';
            $type = $_GET['type'] ?? 'movie';
            if (!$q) error('Query required');
            if ($type === 'tv')    respond(TMDbService::searchTV($q));
            if ($type === 'multi') respond(TMDbService::searchMulti($q));
            respond(TMDbService::searchMovies($q));
            break;

        case 'global':
            $lang = $_GET['lang'] ?? 'en';
            respond(TMDbService::byLanguage($lang, (int)($_GET['page'] ?? 1)));
            break;

        case 'country':
            $country = strtoupper($_GET['country'] ?? 'US');
            $lang    = $_GET['lang'] ?? 'en';
            respond(TMDbService::byCountry($country, $lang));
            break;

        case 'anime':
            respond(TMDbService::anime((int)($_GET['page'] ?? 1)));
            break;

        case 'genres':
            respond(TMDbService::movieGenres());
            break;

        // ── Watchlist (DB-backed) ─────────────────────
        case 'watchlist':
            handleWatchlist($method, $id);
            break;

        // ── Search history ────────────────────────────
        case 'history':
            handleHistory($method);
            break;

        default:
            error('Unknown endpoint', 404);
    }
} catch (Exception $e) {
    // Secure generic message framework for public execution
    error('Internal server routing exception occurred.', 500);
}

// ── Watchlist handlers ────────────────────────────────
function handleWatchlist(string $method, ?string $id): void {
    $sessionId = $_COOKIE['mm_session'] ?? session_id() ?: bin2hex(random_bytes(16));
    if (!isset($_COOKIE['mm_session'])) {
        setcookie('mm_session', $sessionId, time() + 86400 * 365, '/', '', false, true);
    }

    if ($method === 'GET') {
        $collection = $_GET['collection'] ?? 'watchlist';
        $rows = Database::fetchAll(
            'SELECT * FROM watchlist WHERE session_id=? AND collection=? ORDER BY added_at DESC',
            [$sessionId, $collection]
        );
        respond(['results' => $rows]);
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || !isset($data['movie_id'])) error('movie_id required');

        $exists = Database::fetchOne(
            'SELECT id FROM watchlist WHERE session_id=? AND movie_id=? AND collection=?',
            [$sessionId, $data['movie_id'], $data['collection'] ?? 'watchlist']
        );
        if ($exists) respond(['status' => 'already_exists']);

        Database::insert('watchlist', [
            'session_id'  => $sessionId,
            'movie_id'    => (int)$data['movie_id'],
            'title'       => $data['title']       ?? '',
            'poster_path' => $data['poster_path'] ?? '',
            'rating'      => $data['rating']      ?? '',
            'year'        => $data['year']        ?? '',
            'collection'  => $data['collection']  ?? 'watchlist',
            'added_at'    => date('Y-m-d H:i:s'),
        ]);
        respond(['status' => 'added']);
    }

    if ($method === 'DELETE' && $id) {
        Database::query(
            'DELETE FROM watchlist WHERE session_id=? AND movie_id=?',
            [$sessionId, (int)$id]
        );
        respond(['status' => 'deleted']);
    }

    error('Method not allowed', 405);
}

// ── Search history handlers ───────────────────────────
function handleHistory(string $method): void {
    $sessionId = $_COOKIE['mm_session'] ?? '';

    if ($method === 'GET') {
        $rows = Database::fetchAll(
            'SELECT query, searched_at FROM search_history WHERE session_id=? ORDER BY searched_at DESC LIMIT 20',
            [$sessionId]
        );
        respond(['results' => $rows]);
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || !isset($data['query'])) error('query required');
        $sessionId = $_COOKIE['mm_session'] ?? bin2hex(random_bytes(16));

        // Upsert
        Database::query(
            'INSERT INTO search_history (session_id, query, searched_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE searched_at=?',
            [$sessionId, $data['query'], date('Y-m-d H:i:s'), date('Y-m-d H:i:s')]
        );
        respond(['status' => 'saved']);
    }

    error('Method not allowed', 405);
}
