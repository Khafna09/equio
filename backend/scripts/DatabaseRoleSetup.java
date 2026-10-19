import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.regex.Pattern;

public class DatabaseRoleSetup {
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");

    public static void main(String[] args) throws Exception {
        Path envPath = args.length == 0 ? Path.of(".env") : Path.of(args[0]);
        Map<String, String> env = readEnv(envPath);
        String url = required(env, "DB_URL");
        String adminUser = required(env, "DB_MIGRATION_USERNAME");
        String adminPassword = required(env, "DB_MIGRATION_PASSWORD");
        String appUser = required(env, "DB_APP_USERNAME");
        String appPassword = required(env, "DB_APP_PASSWORD");

        if (!IDENTIFIER.matcher(appUser).matches()) {
            throw new IllegalArgumentException("DB_APP_USERNAME is not a safe SQL identifier");
        }

        Properties properties = new Properties();
        properties.setProperty("user", adminUser);
        properties.setProperty("password", adminPassword);
        properties.setProperty("sslfactory", "org.postgresql.ssl.DefaultJavaSSLFactory");
        try (Connection connection = DriverManager.getConnection(url, properties)) {
            connection.setAutoCommit(false);
            String quotedUser = quoteIdentifier(appUser);
            boolean exists;
            try (PreparedStatement statement = connection.prepareStatement(
                    "select 1 from pg_roles where rolname = ?")) {
                statement.setString(1, appUser);
                exists = statement.executeQuery().next();
            }

            String escapedPassword = appPassword.replace("'", "''");
            try (Statement statement = connection.createStatement()) {
                if (!exists) {
                    statement.execute("create role " + quotedUser
                            + " login password '" + escapedPassword
                            + "' nosuperuser nocreatedb nocreaterole noreplication nobypassrls");
                } else {
                    statement.execute("alter role " + quotedUser
                            + " with login password '" + escapedPassword
                            + "' nosuperuser nocreatedb nocreaterole noreplication nobypassrls");
                }
                statement.execute("revoke create on schema public from public");
                statement.execute("grant connect on database "
                        + quoteIdentifier(connection.getCatalog()) + " to " + quotedUser);
                statement.execute("grant usage on schema public to " + quotedUser);
                for (String table : List.of("users", "role", "user_roles", "profiles", "refresh_token_sessions",
                        "categories", "movements", "budgets", "saving_goals", "savings_pools", "savings_pool_transactions")) {
                    boolean tableExists;
                    try (PreparedStatement check = connection.prepareStatement("select to_regclass(?) is not null")) {
                        check.setString(1, "public." + table);
                        try (ResultSet result = check.executeQuery()) {
                            result.next();
                            tableExists = result.getBoolean(1);
                        }
                    }
                    if (tableExists) statement.execute("grant select, insert, update, delete on table public."
                            + quoteIdentifier(table) + " to " + quotedUser);
                }
                statement.execute("grant usage, select "
                        + "on all sequences in schema public to " + quotedUser);
                statement.execute("alter default privileges in schema public "
                        + "revoke all on tables from " + quotedUser);
                statement.execute("alter default privileges in schema public "
                        + "revoke all on sequences from " + quotedUser);
                try (ResultSet result = statement.executeQuery("select to_regclass('public.flyway_schema_history') is not null")) {
                    result.next();
                    if (result.getBoolean(1)) {
                        try (Statement revoke = connection.createStatement()) {
                            revoke.execute("revoke all on table public.flyway_schema_history from " + quotedUser);
                        }
                    }
                }
            }
            connection.commit();
        }
        System.out.println("Application database role configured.");
    }

    private static Map<String, String> readEnv(Path path) throws Exception {
        Map<String, String> values = new HashMap<>();
        for (String line : Files.exists(path) ? Files.readAllLines(path) : List.<String>of()) {
            String value = line.trim();
            if (value.isEmpty() || value.startsWith("#") || !value.contains("=")) {
                continue;
            }
            int separator = value.indexOf('=');
            values.put(value.substring(0, separator), value.substring(separator + 1));
        }
        values.putAll(System.getenv());
        return values;
    }

    private static String required(Map<String, String> values, String name) {
        String value = values.get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing environment variable: " + name);
        }
        return value;
    }

    private static String quoteIdentifier(String value) {
        if (!IDENTIFIER.matcher(value).matches()) {
            throw new IllegalArgumentException("Unsafe SQL identifier");
        }
        return String.valueOf((char) 34) + value + (char) 34;
    }
}
