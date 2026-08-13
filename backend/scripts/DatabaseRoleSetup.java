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

        try (Connection connection = DriverManager.getConnection(
                url, adminUser, adminPassword)) {
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
                            + "' nosuperuser nocreatedb nocreaterole noreplication");
                } else {
                    statement.execute("alter role " + quotedUser
                            + " with login password '" + escapedPassword
                            + "' nosuperuser nocreatedb nocreaterole noreplication");
                }
                statement.execute("revoke create on schema public from public");
                statement.execute("grant connect on database "
                        + quoteIdentifier(connection.getCatalog()) + " to " + quotedUser);
                statement.execute("grant usage on schema public to " + quotedUser);
                statement.execute("grant select, insert, update, delete "
                        + "on all tables in schema public to " + quotedUser);
                statement.execute("grant usage, select "
                        + "on all sequences in schema public to " + quotedUser);
                statement.execute("alter default privileges in schema public "
                        + "grant select, insert, update, delete on tables to " + quotedUser);
                statement.execute("alter default privileges in schema public "
                        + "grant usage, select on sequences to " + quotedUser);
            }
            connection.commit();
        }
        System.out.println("Application database role configured.");
    }

    private static Map<String, String> readEnv(Path path) throws Exception {
        Map<String, String> values = new HashMap<>();
        for (String line : Files.readAllLines(path)) {
            String value = line.trim();
            if (value.isEmpty() || value.startsWith("#") || !value.contains("=")) {
                continue;
            }
            int separator = value.indexOf('=');
            values.put(value.substring(0, separator), value.substring(separator + 1));
        }
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
