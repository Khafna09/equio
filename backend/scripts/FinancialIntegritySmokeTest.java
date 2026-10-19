import java.math.BigDecimal;
import java.net.*;
import java.net.http.*;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.*;

public class FinancialIntegritySmokeTest {
    private static final String BASE = System.getenv().getOrDefault("TEST_API_BASE_URL", "http://localhost:8081/api/v1");
    private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
    private final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies)
            .connectTimeout(Duration.ofSeconds(5)).build();
    private String token;

    public static void main(String[] args) throws Exception {
        URI host = URI.create(BASE);
        require(Set.of("localhost", "127.0.0.1").contains(host.getHost()), "Run only against a disposable local API");
        require(required("DB_URL").matches("jdbc:postgresql://(localhost|127\\.0\\.0\\.1):\\d+/[^?]+.*"),
                "Run only against a disposable local database");
        String suffix = UUID.randomUUID().toString();
        String a = "financial-a-" + suffix + "@test.example";
        String b = "financial-b-" + suffix + "@test.example";
        try {
            FinancialIntegritySmokeTest first = new FinancialIntegritySmokeTest();
            FinancialIntegritySmokeTest second = new FinancialIntegritySmokeTest();
            first.login(a);
            second.login(b);
            first.run(second);
            System.out.println("PASS financial-integrity concurrent-allocation concurrent-close tenant-isolation goal-provenance");
        } finally {
            cleanup(a, b);
        }
    }

    private void login(String email) throws Exception {
        expect(send("GET", "/auth/csrf", null), 200);
        String payload = "{\"email\":\"" + email + "\",\"password\":\"Financial-Test-2026!\"";
        expect(send("POST", "/auth/sign-up", payload + ",\"firstName\":\"Audit\",\"lastName\":\"Finance\",\"language\":\"es\"}"), 202);
        token = string(expect(send("POST", "/auth/sign-in", payload + "}"), 200).body(), "accessToken");
    }

    private void run(FinancialIntegritySmokeTest other) throws Exception {
        LocalDate today = LocalDate.now();
        long categoryA = category("Food");
        long categoryB = category("Travel");
        long global = id(expect(send("POST", "/budgets", budget("1000", today.minusDays(1), today.plusDays(10), null, null)), 201));
        String expenseBody = movement("200", today.atStartOfDay());
        long expense = id(expect(send("POST", "/movements", expenseBody), 201));
        expect(other.send("GET", "/movements/" + expense, null), 404);
        expect(other.send("GET", "/budgets/" + global, null), 404);

        var allocations = concurrent("POST", "/budgets",
                budget("700", today, today.plusDays(10), categoryA, global),
                budget("700", today, today.plusDays(10), categoryB, global));
        require(allocations.stream().filter(r -> r.statusCode() == 201).count() == 1
                && allocations.stream().filter(r -> r.statusCode() == 409).count() == 1,
                "Concurrent category allocations exceeded parent capacity");
        long firstChild = id(allocations.stream().filter(r -> r.statusCode() == 201).findFirst().orElseThrow());
        Long firstCategory = allocations.getFirst().statusCode() == 201 ? categoryA : categoryB;
        Long secondCategory = firstCategory.equals(categoryA) ? categoryB : categoryA;
        long secondChild = id(expect(send("POST", "/budgets", budget("300", today, today.plusDays(10), secondCategory, global)), 201));
        expect(send("PUT", "/budgets/" + firstChild, budget("400", today.minusDays(1), today.plusDays(10), firstCategory, global)), 200);
        expect(send("PUT", "/budgets/" + secondChild, budget("400", today.minusDays(1), today.plusDays(10), secondCategory, global)), 200);
        var firstUpdate = client.sendAsync(request("PUT", "/budgets/" + firstChild,
                budget("600", today.minusDays(1), today.plusDays(10), firstCategory, global)), HttpResponse.BodyHandlers.ofString());
        var secondUpdate = client.sendAsync(request("PUT", "/budgets/" + secondChild,
                budget("600", today.minusDays(1), today.plusDays(10), secondCategory, global)), HttpResponse.BodyHandlers.ofString());
        var updates = List.of(firstUpdate.get(20, TimeUnit.SECONDS), secondUpdate.get(20, TimeUnit.SECONDS));
        require(updates.stream().filter(r -> r.statusCode() == 200).count() == 1
                && updates.stream().filter(r -> r.statusCode() == 409).count() == 1,
                "Concurrent updates exceeded allocation capacity");
        expect(send("DELETE", "/budgets/" + global + "?cascade=false", null), 409);
        expect(send("DELETE", "/categories/" + firstCategory, null), 409);

        var closures = concurrent("PATCH", "/budgets/" + global + "/close", null, null);
        require(closures.stream().filter(r -> r.statusCode() == 200).count() == 1
                && closures.stream().filter(r -> r.statusCode() == 409).count() == 1,
                "Concurrent closure was not idempotent");
        require(number(expect(send("GET", "/savings/pool", null), 200).body(), "balance").compareTo(new BigDecimal("800")) == 0,
                "Closure credited an incorrect or duplicate savings amount");
        expect(send("PUT", "/movements/" + expense, movement("900", today.atStartOfDay())), 409);
        expect(send("DELETE", "/movements/" + expense, null), 409);
        expect(send("POST", "/movements", expenseBody), 409);
        expect(send("DELETE", "/budgets/" + global + "?cascade=true", null), 409);
        expect(send("POST", "/budgets", budget("1000", today.minusDays(1), today.plusDays(10), null, null)), 409);

        long next = id(expect(send("POST", "/budgets", budget("1000", today, today.plusDays(10), null, null)), 201));
        Thread.sleep(1_100);
        expect(send("POST", "/movements", movement("20", LocalDateTime.now().withNano(0))), 201);
        require(number(expect(send("GET", "/budgets/" + next, null), 200).body(), "spentAmount").compareTo(new BigDecimal("20")) == 0,
                "A same-day replacement budget reused expenses from the closed cycle");
        require(number(expect(send("GET", "/dashboard/summary?period=BUDGET&referenceDate=" + today, null), 200).body(), "totalExpense")
                .compareTo(new BigDecimal("20")) == 0, "Dashboard does not use the accounting boundary");
        String dashboard = expect(send("GET", "/dashboard/summary?period=BUDGET&referenceDate=" + today, null), 200).body();
        String startAt = URLEncoder.encode(string(dashboard, "accountingStartAt"), java.nio.charset.StandardCharsets.UTF_8);
        String recent = expect(send("GET", "/movements?startDate=" + today + "&endDate=" + today.plusDays(10) + "&startAt=" + startAt, null), 200).body();
        require(!recent.contains("\"id\":" + expense + ","), "Recent movements include the closed cycle");

        long goal = id(expect(send("POST", "/savings", "{\"name\":\"Trip\",\"targetAmount\":500}"), 201));
        expect(send("POST", "/savings/" + goal + "/fund", "{\"amount\":50,\"operation\":\"ADD\"}"), 200);
        String movements = expect(send("GET", "/movements", null), 200).body();
        Matcher managed = Pattern.compile("\\{[^{}]*\"id\":(\\d+)[^{}]*\"source\":\"GOAL_CONTRIBUTION\"[^{}]*}").matcher(movements);
        require(managed.find(), "Goal contribution has no explicit movement provenance");
        expect(send("DELETE", "/movements/" + managed.group(1), null), 409);
        expect(send("PUT", "/movements/" + managed.group(1), movement("20", LocalDateTime.now().withNano(0))), 409);
        expect(send("DELETE", "/savings/" + goal, null), 409);
        expect(send("POST", "/savings/" + goal + "/fund", "{\"amount\":50,\"operation\":\"WITHDRAW\"}"), 200);
        expect(send("DELETE", "/savings/" + goal, null), 204);
        long independentCategory = category("Housing");
        expect(send("PUT", "/budgets/mode", "{\"mode\":\"ADVANCED\"}"), 200);
        var normal = client.sendAsync(request("PUT", "/budgets/mode", "{\"mode\":\"NORMAL\"}"), HttpResponse.BodyHandlers.ofString());
        var independent = client.sendAsync(request("POST", "/budgets",
                budget("100", today, today.plusDays(10), independentCategory, null).replace("\"name\":\"Audit\"", "\"name\":\"Audit\",\"isIndependent\":true")), HttpResponse.BodyHandlers.ofString());
        var modeResponse = normal.get(20, TimeUnit.SECONDS);
        var createResponse = independent.get(20, TimeUnit.SECONDS);
        require((modeResponse.statusCode() == 200 && createResponse.statusCode() == 409)
                || (modeResponse.statusCode() == 409 && createResponse.statusCode() == 201),
                "Concurrent mode change left an independent budget in normal mode");
        require(number(expect(other.send("GET", "/savings/pool", null), 200).body(), "balance").signum() == 0,
                "Savings pool leaked across accounts");
        var settings = other.client.sendAsync(other.request("PUT", "/profiles/me", "{\"theme\":\"dark\"}"), HttpResponse.BodyHandlers.ofString());
        var mode = other.client.sendAsync(other.request("PUT", "/budgets/mode", "{\"mode\":\"ADVANCED\"}"), HttpResponse.BodyHandlers.ofString());
        expect(settings.get(20, TimeUnit.SECONDS), 200);
        expect(mode.get(20, TimeUnit.SECONDS), 200);
        require(string(expect(other.send("GET", "/profiles/me", null), 200).body(), "budgetMode").equals("ADVANCED"),
                "Concurrent settings update overwrote the budget mode");
    }

    private long category(String name) throws Exception {
        return id(expect(send("POST", "/categories", "{\"name\":\"" + name + "\",\"color\":\"#12AB34\",\"icon\":\"wallet\"}"), 201));
    }

    private String budget(String amount, LocalDate start, LocalDate end, Long category, Long parent) {
        return "{\"name\":\"Audit\",\"totalAmount\":" + amount + ",\"isFixed\":false,\"startDate\":\"" + start
                + "\",\"endDate\":\"" + end + "\",\"categoryId\":" + category + ",\"parentBudgetId\":" + parent + "}";
    }

    private String movement(String amount, LocalDateTime date) {
        return "{\"amount\":" + amount + ",\"type\":\"EXPENSE\",\"description\":\"Audit\",\"date\":\"" + date + "\"}";
    }

    private List<HttpResponse<String>> concurrent(String method, String path, String first, String second) throws Exception {
        var a = client.sendAsync(request(method, path, first), HttpResponse.BodyHandlers.ofString());
        var b = client.sendAsync(request(method, path, second), HttpResponse.BodyHandlers.ofString());
        return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
    }

    private HttpRequest request(String method, String path, String body) {
        var request = HttpRequest.newBuilder(URI.create(BASE + path)).timeout(Duration.ofSeconds(15));
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (path.startsWith("/auth/") && !method.equals("GET")) {
            cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("XSRF-TOKEN"))
                    .findFirst().ifPresent(c -> request.header("X-XSRF-TOKEN", c.getValue()));
        }
        if (body != null) request.header("Content-Type", "application/json");
        return request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)).build();
    }

    private HttpResponse<String> send(String method, String path, String body) throws Exception {
        return client.send(request(method, path, body), HttpResponse.BodyHandlers.ofString());
    }

    private static HttpResponse<String> expect(HttpResponse<String> response, int status) {
        require(response.statusCode() == status, "Expected HTTP " + status + ", received " + response.statusCode() + ": " + response.body());
        return response;
    }

    private static long id(HttpResponse<String> response) { return number(response.body(), "id").longValueExact(); }

    private static BigDecimal number(String body, String field) {
        Matcher matcher = Pattern.compile("\"" + field + "\":(-?\\d+(?:\\.\\d+)?)").matcher(body);
        require(matcher.find(), "Missing numeric field " + field);
        return new BigDecimal(matcher.group(1));
    }

    private static String string(String body, String field) {
        Matcher matcher = Pattern.compile("\"" + field + "\":\"([^\"]+)\"").matcher(body);
        require(matcher.find(), "Missing field " + field);
        return matcher.group(1);
    }

    private static void cleanup(String... emails) throws Exception {
        try (Connection connection = DriverManager.getConnection(required("DB_URL"), required("DB_MIGRATION_USERNAME"), required("DB_MIGRATION_PASSWORD"))) {
            connection.setAutoCommit(false);
            for (String email : emails) {
                for (String sql : List.of(
                        "delete from savings_pool_transactions where user_id in (select id from users where email = ?)",
                        "delete from savings_pools where user_id in (select id from users where email = ?)",
                        "delete from movements where user_id in (select id from users where email = ?)",
                        "delete from saving_goals where user_id in (select id from users where email = ?)",
                        "update budgets set parent_budget_id = null where user_id in (select id from users where email = ?)",
                        "delete from budgets where user_id in (select id from users where email = ?)",
                        "delete from categories where user_id in (select id from users where email = ?)",
                        "delete from refresh_token_sessions where user_id in (select id from users where email = ?)",
                        "delete from profiles where user_id in (select id from users where email = ?)",
                        "delete from user_roles where user_id in (select id from users where email = ?)",
                        "delete from users where email = ?")) {
                    try (PreparedStatement statement = connection.prepareStatement(sql)) {
                        statement.setString(1, email);
                        statement.executeUpdate();
                    }
                }
            }
            connection.commit();
        }
    }

    private static String required(String name) {
        String value = System.getenv(name);
        require(value != null && !value.isBlank(), "Missing " + name);
        return value;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
