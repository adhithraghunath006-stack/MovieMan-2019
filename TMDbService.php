<?php
require_once __DIR__ . '/../config/config.php';

class TMDbService {

    private static function get(string $path, array $params = []): array {
        $params['api_key'] = TMDB_API_KEY;
        $url = TMDB_BASE . $path . '?' . http_build_query($params);

        $ctx = stream_context_create(['http' => [
            'timeout' => 10,
            'header'  => "Accept: application/json\r\nUser-Agent: MovieMan2019/1.0\r\n",
        ]]);

        $json = @file_get_contents($url, false, $ctx);
        if ($json === false) {
            // Generic Error Throwing to prevent internal path tracing
            throw new RuntimeException("External API service temporarily unavailable.");
        }
        return json_decode($json, true) ?? [];
    }

    // ── Movies ────────────────────────────────────────
    public static function trending(string $type = 'movie', string $window = 'week'): array {
        return self::get("/trending/$type/$window");
    }

    public static function nowPlaying(int $page = 1): array {
        return self::get('/movie/now_playing', ['page' => $page]);
    }

    public static function topRated(int $page = 1): array {
        return self::get('/movie/top_rated', ['page' => $page]);
    }

    public static function upcoming(int $page = 1): array {
        return self::get('/movie/upcoming', ['page' => $page]);
    }

    public static function movieDetail(int $id, string $append = 'credits,videos,keywords'): array {
        return self::get("/movie/$id", ['append_to_response' => $append]);
    }

    public static function tvDetail(int $id, string $append = 'credits,videos'): array {
        return self::get("/tv/$id", ['append_to_response' => $append]);
    }

    // ── Discover ──────────────────────────────────────
    public static function discover(array $params = []): array {
        return self::get('/discover/movie', $params);
    }

    public static function discoverTV(array $params = []): array {
        return self::get('/discover/tv', $params);
    }

    // ── Search ────────────────────────────────────────
    public static function searchMovies(string $q, int $page = 1): array {
        return self::get('/search/movie', ['query' => $q, 'page' => $page]);
    }

    public static function searchTV(string $q, int $page = 1): array {
        return self::get('/search/tv', ['query' => $q, 'page' => $page]);
    }

    public static function searchMulti(string $q, int $page = 1): array {
        return self::get('/search/multi', ['query' => $q, 'page' => $page]);
    }

    // ── Genres ────────────────────────────────────────
    public static function movieGenres(): array {
        return self::get('/genre/movie/list');
    }

    // ── Global ────────────────────────────────────────
    public static function byLanguage(string $lang, int $page = 1): array {
        return self::get('/discover/movie', [
            'with_original_language' => $lang,
            'sort_by'                => 'popularity.desc',
            'vote_count.gte'         => 100,
            'page'                   => $page,
        ]);
    }

    public static function byCountry(string $country, string $lang, int $page = 1): array {
        return self::get('/discover/movie', [
            'with_origin_country'    => $country,
            'with_original_language' => $lang,
            'sort_by'                => 'popularity.desc',
            'vote_count.gte'         => 50,
            'page'                   => $page,
        ]);
    }

    // ── Anime ─────────────────────────────────────────
    public static function anime(int $page = 1): array {
        return self::get('/discover/tv', [
            'with_genres'            => '16',
            'with_original_language' => 'ja',
            'sort_by'                => 'popularity.desc',
            'vote_count.gte'         => 200,
            'page'                   => $page,
        ]);
    }
}
