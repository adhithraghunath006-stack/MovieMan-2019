-- ═══════════════════════════════════════════════════════
-- MovieMan 2019 — Complete MySQL Database Schema (Optimized)
-- Import with: mysql -u root -p movieman_db < schema.sql
-- ═══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS `movieman_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `movieman_db`;

-- ── 1. Users Table (Core Auth System) ───────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL, -- Secure BCRYPT Hash
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Watchlist (Linked to Session & Active Users) ─────
CREATE TABLE IF NOT EXISTS `watchlist` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED DEFAULT NULL, -- Null if guest visitor
  `session_id`  VARCHAR(64)  NOT NULL,
  `movie_id`    INT UNSIGNED NOT NULL,
  `title`       VARCHAR(255) NOT NULL DEFAULT '',
  `poster_path` VARCHAR(255) NOT NULL DEFAULT '',
  `rating`      VARCHAR(10)  NOT NULL DEFAULT '',
  `year`        VARCHAR(10)  NOT NULL DEFAULT '',
  `collection`  ENUM('watchlist','watching','watched','favorites') NOT NULL DEFAULT 'watchlist',
  `added_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- UNIQUE Constraint handled seamlessly via conditional application or session nodes
  UNIQUE KEY `uq_session_movie_col` (`session_id`, `movie_id`, `collection`),
  KEY `idx_user_col` (`user_id`, `collection`),
  KEY `idx_session_col` (`session_id`, `collection`),
  CONSTRAINT `fk_watchlist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. Search History ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `search_history` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED DEFAULT NULL, -- Null if guest visitor
  `session_id`  VARCHAR(64)  NOT NULL,
  `query`       VARCHAR(255) NOT NULL,
  `searched_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_session_query` (`session_id`, `query`),
  KEY `idx_user_time` (`user_id`, `searched_at`),
  KEY `idx_session_time` (`session_id`, `searched_at`),
  CONSTRAINT `fk_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Movie Cache (TMDb Optimization) ───────────────────
CREATE TABLE IF NOT EXISTS `movie_cache` (
  `id`          INT UNSIGNED  NOT NULL,
  `type`        ENUM('movie','tv') NOT NULL DEFAULT 'movie',
  `data`        MEDIUMTEXT    NOT NULL,
  `cached_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `type`),
  KEY `idx_cached_at` (`cached_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. Active Sessions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id`   VARCHAR(64)  NOT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_agent`   VARCHAR(512) NOT NULL DEFAULT '',
  `ip_hash`      VARCHAR(64)  NOT NULL DEFAULT '',
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
