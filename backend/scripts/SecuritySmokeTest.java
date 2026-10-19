import java.net.*;
import java.net.http.*;
import java.nio.file.*;
import java.sql.*;
import java.time.Duration;
import java.util.*;
import java.util.regex.*;

public class SecuritySmokeTest {
    private static final String BASE = System.getenv().getOrDefault("TEST_API_BASE_URL", "http://localhost:8081/api/v1");
    private static final Pattern ACCESS_TOKEN =
            Pattern.compile("\"accessToken\":\"([^\"]+)\"");
    private static final Pattern ID =
            Pattern.compile("\"id\":(\\d+)");
    private static final Pattern EXPIRES =
            Pattern.compile("\"expiresInSeconds\":(\\d+)");

    private final CookieManager cookies =
            new CookieManager(null, CookiePolicy.ACCEPT_ALL);
    private final HttpClient client = HttpClient.newBuilder()
            .cookieHandler(cookies)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public static void main(String[] args) throws Exception {
        Map<String, String> env = readEnv(
                args.length == 0 ? Path.of(".env") : Path.of(args[0]));
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String emailA = "smoke-a-" + suffix + "@t.dev";
        String emailB = "smoke-b-" + suffix + "@t.dev";
        Throwable failure = null;
        try {
            new SecuritySmokeTest().run(emailA, emailB);
            System.out.println(
                    "PASS access-token-15m refresh-cookie rotation reuse-detection csrf cors "
                    + "headers rate-limit idor-rls");
        } catch (Throwable exception) {
            failure = exception;
            throw exception;
        } finally {
            try {
                cleanupUsers(env, emailA, emailB);
            } catch (Throwable cleanupFailure) {
                if (failure != null) {
                    failure.addSuppressed(cleanupFailure);
                } else {
                    throw cleanupFailure;
                }
            }
        }
    }

    private void run(String emailA, String emailB) throws Exception {
        Session a = registerAndLogin(emailA, "Angela");
        Session b = registerAndLogin(emailB, "Bruno");

        Response category = send(
                "POST",
                "/categories",
                "{\"name\":\"Private\","
                        + "\"color\":\"#12AB34\","
                        + "\"icon\":\"lock\"}",
                Map.of("Authorization", "Bearer " + a.accessToken()));
        require(category.status() == 201, "Category creation failed: " + category.body());
        String categoryId = match(ID, category.body(), "category ID");

        Response idor = send(
                "GET",
                "/categories/" + categoryId,
                null,
                Map.of("Authorization", "Bearer " + b.accessToken()));
        require(idor.status() == 404, "IDOR must return 404");

        Response missingCsrf = send("POST", "/auth/refresh", null, Map.of());
        require(missingCsrf.status() == 403, "Missing CSRF must return 403");

        String csrf = rawCsrfCookie();
        String originalRefreshToken = rawRefreshCookie();
        Response refreshed = send(
                "POST",
                "/auth/refresh",
                null,
                Map.of("X-XSRF-TOKEN", csrf));
        require(refreshed.status() == 200, "Refresh rotation failed");
        require(!match(ACCESS_TOKEN, refreshed.body(), "rotated token")
                .equals(a.accessToken()), "Access token was not rotated");

        Response reuse = sendWithoutCookieManager(
                "POST",
                "/auth/refresh",
                Map.of(
                        "Cookie", "XSRF-TOKEN=" + csrf
                                + "; equio_refresh=" + originalRefreshToken,
                        "X-XSRF-TOKEN", csrf
                ));
        require(reuse.status() == 401,
                "Reused refresh token must be rejected");
        Response revokedFamily = send(
                "POST",
                "/auth/refresh",
                null,
                Map.of("X-XSRF-TOKEN", rawCsrfCookie()));
        require(revokedFamily.status() == 401,
                "Refresh token family was not revoked after reuse");

        Response anonymous = send("GET", "/categories", null, Map.of());
        require(anonymous.status() == 401, "Anonymous request must return 401");

        Response cors = send(
                "OPTIONS",
                "/categories",
                null,
                Map.of(
                        "Origin", "https://attacker.example",
                        "Access-Control-Request-Method", "GET"
                ));
        require(cors.header("Access-Control-Allow-Origin").isEmpty(),
                "Untrusted CORS origin was allowed");

        boolean limited = false;
        for (int attempt = 0; attempt < 12; attempt++) {
            Response invalid = send(
                    "POST",
                    "/auth/sign-in",
                    "{\"email\":\"missing-" + UUID.randomUUID()
                            + "@t.dev\",\"password\":"
                            + "\"Wrong-Password-2026!\"}",
                    Map.of("X-XSRF-TOKEN", rawCsrfCookie()));
            if (invalid.status() == 429) {
                limited = true;
                break;
            }
            require(invalid.status() == 401, "Invalid login leaked an error");
        }
        require(limited, "Login rate limit did not return 429");

        require(EXPIRES.matcher(a.responseBody()).find(),
                "Access expiration is missing");
        require(a.responseBody().contains("\"expiresInSeconds\":900"),
                "Access token lifetime is not 15 minutes");
        require(a.setCookie().contains("HttpOnly")
                        && a.setCookie().contains("SameSite=Strict"),
                "Refresh cookie flags are incomplete");
        require("nosniff".equalsIgnoreCase(a.nosniff()),
                "nosniff header is missing");
    }

    private Session registerAndLogin(String email, String firstName)
            throws Exception {
        send("GET", "/auth/csrf", null, Map.of());
        String authCsrf = rawCsrfCookie();
        Response signup = send(
                "POST",
                "/auth/sign-up",
                "{\"email\":\"" + email
                        + "\",\"password\":\"Security-Test-2026!\","
                        + "\"firstName\":\"" + firstName
                        + "\",\"lastName\":\"Audit\","
                        + "\"language\":\"es\"}",
                Map.of("X-XSRF-TOKEN", authCsrf));
        require(signup.status() == 202, "Sign-up failed: " + signup.body());

        Response signin = send(
                "POST",
                "/auth/sign-in",
                "{\"email\":\"" + email
                        + "\",\"password\":\"Security-Test-2026!\"}",
                Map.of("X-XSRF-TOKEN", authCsrf));
        require(signin.status() == 200, "Sign-in failed: " + signin.body());
        String token = match(ACCESS_TOKEN, signin.body(), "access token");
        send("GET", "/auth/csrf", null, Map.of());
        return new Session(
                token,
                signin.body(),
                signin.header("Set-Cookie"),
                signin.header("X-Content-Type-Options")
        );
    }

    private String rawCsrfCookie() {
        return cookies.getCookieStore().getCookies().stream()
                .filter(cookie -> "XSRF-TOKEN".equals(cookie.getName()))
                .map(HttpCookie::getValue)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "XSRF-TOKEN cookie is missing"));
    }

    private String rawRefreshCookie() {
        return cookies.getCookieStore().getCookies().stream()
                .filter(cookie -> "equio_refresh".equals(cookie.getName()))
                .map(HttpCookie::getValue)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Refresh cookie is missing"));
    }

    private Response sendWithoutCookieManager(
            String method,
            String path,
            Map<String, String> headers
    ) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder()
                .uri(URI.create(BASE + path))
                .timeout(Duration.ofSeconds(10));
        headers.forEach(request::header);
        HttpResponse<String> response = HttpClient.newHttpClient().send(
                request.method(method, HttpRequest.BodyPublishers.noBody()).build(),
                HttpResponse.BodyHandlers.ofString());
        return new Response(
                response.statusCode(),
                response.body(),
                response.headers()
        );
    }

    private Response send(
            String method,
            String path,
            String body,
            Map<String, String> headers
    ) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder()
                .uri(URI.create(BASE + path))
                .timeout(Duration.ofSeconds(10));
        headers.forEach(request::header);
        if (body == null) {
            request.method(method, HttpRequest.BodyPublishers.noBody());
        } else {
            request.header("Content-Type", "application/json");
            request.method(method, HttpRequest.BodyPublishers.ofString(body));
        }
        HttpResponse<String> response = client.send(
                request.build(),
                HttpResponse.BodyHandlers.ofString());
        return new Response(
                response.statusCode(),
                response.body(),
                response.headers()
        );
    }

    private static String match(
            Pattern pattern,
            String value,
            String field
    ) {
        Matcher matcher = pattern.matcher(value);
        if (!matcher.find()) {
            throw new IllegalStateException("Missing " + field + ": " + value);
        }
        return matcher.group(1);
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    private static void cleanupUsers(
            Map<String, String> env,
            String... exactEmails
    ) throws Exception {
        String[] statements = {
                "delete from refresh_token_sessions where user_id in "
                        + "(select id from users where email = ?)",
                "delete from saving_goals where user_id in "
                        + "(select id from users where email = ?)",
                "update budgets set parent_budget_id = null where user_id in "
                        + "(select id from users where email = ?)",
                "delete from budgets where user_id in "
                        + "(select id from users where email = ?)",
                "delete from movements where user_id in "
                        + "(select id from users where email = ?)",
                "delete from categories where user_id in "
                        + "(select id from users where email = ?)",
                "delete from profiles where user_id in "
                        + "(select id from users where email = ?)",
                "delete from user_roles where user_id in "
                        + "(select id from users where email = ?)",
                "delete from users where email = ?"
        };

        try (Connection connection = DriverManager.getConnection(
                required(env, "DB_URL"),
                required(env, "DB_MIGRATION_USERNAME"),
                required(env, "DB_MIGRATION_PASSWORD"))) {
            connection.setAutoCommit(false);
            try {
                for (String sql : statements) {
                    try (PreparedStatement statement =
                                 connection.prepareStatement(sql)) {
                        for (String email : exactEmails) {
                            statement.setString(1, email);
                            statement.addBatch();
                        }
                        statement.executeBatch();
                    }
                }
                connection.commit();
            } catch (Exception exception) {
                connection.rollback();
                throw exception;
            }
        }
    }

    private static Map<String, String> readEnv(Path path) throws Exception {
        Map<String, String> values = new HashMap<>();
        for (String line : Files.exists(path) ? Files.readAllLines(path) : List.<String>of()) {
            if (!line.isBlank() && !line.startsWith("#") && line.contains("=")) {
                int separator = line.indexOf('=');
                values.put(
                        line.substring(0, separator),
                        line.substring(separator + 1)
                );
            }
        }
        values.putAll(System.getenv());
        return values;
    }

    private static String required(Map<String, String> env, String name) {
        String value = env.get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing " + name);
        }
        return value;
    }

    private record Session(
            String accessToken,
            String responseBody,
            String setCookie,
            String nosniff
    ) {
    }

    private record Response(
            int status,
            String body,
            HttpHeaders headers
    ) {
        String header(String name) {
            return headers.firstValue(name).orElse("");
        }
    }
}
