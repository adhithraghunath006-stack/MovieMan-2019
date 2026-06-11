<?php
// ═══════════════════════════════════════════════════════
// MovieMan 2019 — Complete Production API Configuration
// ═══════════════════════════════════════════════════════

// Advanced Security Configurations for Sessions
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax');

// Production Environment Error Control (Logs hidden from end users for security)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Ensure session identifiers are initialized safely for tracking
if (!isset($_SESSION['session_id'])) {
    $_SESSION['session_id'] = bin2hex(random_bytes(32));
}

// Global Application Utilities Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// TMDb External API Integrations Settings — [PLACEHOLDER FOR SECURITY]
define('TMDB_API_KEY', 'YOUR_TMDB_API_KEY_HERE'); // 💡 Put your TMDb API key here locally
define('TMDB_BASE',    'https://api.themoviedb.org/3');
define('TMDB_IMAGE',   'https://image.tmdb.org/t/p/');

// Upgraded Database Configurations — [PLACEHOLDER FOR SECURITY]
define('DB_HOST',     'YOUR_INFINITYFREE_DB_HOST_HERE'); // e.g., sql312.infinityfree.com
define('DB_NAME',     'YOUR_INFINITYFREE_DB_NAME_HERE'); // e.g., if0_XXXXX_movieman
define('DB_USER',     'YOUR_INFINITYFREE_DB_USER_HERE'); // e.g., if0_XXXXX
define('DB_PASS',     'YOUR_INFINITYFREE_DB_PASSWORD_HERE'); // Your vPanel/MySQL Password
define('DB_CHARSET',  'utf8mb4');

// Core App Settings 
define('APP_ENV',    'production'); 
define('APP_SECRET', 'YOUR_RANDOM_32_CHAR_SECRET_KEY_HERE'); // 💡 Set a strong custom secret key locally
define('CORS_ORIGIN', '*');
