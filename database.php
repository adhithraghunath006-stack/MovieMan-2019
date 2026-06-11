<?php
// ═══════════════════════════════════════════════════════
// MovieMan 2019 — Executive Database Wrapper (Final Build)
// ═══════════════════════════════════════════════════════

require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $pdo = null;

    // Singleton connection handle instance
    public static function get(): PDO {
        if (self::$pdo === null) {
            try {
                $dsn = sprintf(
                    'mysql:host=%s;dbname=%s;charset=%s',
                    DB_HOST, DB_NAME, DB_CHARSET
                );
                self::$pdo = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                header('Content-Type: application/json; charset=utf-8');
                // Secure Generic Message for Production
                echo json_encode(["status" => "error", "message" => "Database Connection Failed. Please check server settings."]);
                exit;
            }
        }
        return self::$pdo;
    }

    // Standard prepared statement queries handling
    public static function query(string $sql, array $params = []): PDOStatement {
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // Generic statement runner for UPDATE, DELETE queries returning affected row counts
    public static function execute(string $sql, array $params = []): int {
        $stmt = self::query($sql, $params);
        return $stmt->rowCount();
    }

    // Fetch multiple records wrapper
    public static function fetchAll(string $sql, array $params = []): array {
        return self::query($sql, $params)->fetchAll();
    }

    // Fetch single record wrapper
    public static function fetchOne(string $sql, array $params = []): ?array {
        $row = self::query($sql, $params)->fetch();
        return $row ?: null;
    }

    // Dynamically insert entries wrapper
    public static function insert(string $table, array $data): int {
        $cols = implode(',', array_map(function($col) { return "`$col`"; }, array_keys($data)));
        $placeholders = implode(',', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO `$table` ($cols) VALUES ($placeholders)";
        self::query($sql, array_values($data));
        return (int) self::get()->lastInsertId();
    }
}
