import java.nio.file.*;
import java.sql.*;
import java.util.*;

public class DatabaseSecurityCheck {
    public static void main(String[] args) throws Exception {
        Map<String, String> env = readEnv(
                args.length == 0 ? Path.of(".env") : Path.of(args[0]));
        String url = required(env, "DB_URL");
        String appUser = required(env, "DB_APP_USERNAME");

        try (Connection admin = DriverManager.getConnection(
                url,
                required(env, "DB_MIGRATION_USERNAME"),
                required(env, "DB_MIGRATION_PASSWORD"))) {
            try (PreparedStatement role = admin.prepareStatement(
                    "select rolsuper, rolbypassrls, rolcreatedb, rolcreaterole "
                            + "from pg_roles where rolname = ?")) {
                role.setString(1, appUser);
                try (ResultSet result = role.executeQuery()) {
                    require(result.next(), "Application role does not exist");
                    require(!result.getBoolean(1), "Application role is superuser");
                    require(!result.getBoolean(2), "Application role bypasses RLS");
                    require(!result.getBoolean(3), "Application role can create DBs");
                    require(!result.getBoolean(4), "Application role can create roles");
                }
            }

            try (PreparedStatement rls = admin.prepareStatement(
                    "select count(*) from pg_class "
                            + "where relname = any (?) "
                            + "and relrowsecurity and relforcerowsecurity")) {
                Array tables = admin.createArrayOf(
                        "text",
                        new String[]{
                                "categories",
                                "movements",
                                "budgets",
                                "saving_goals"
                        });
                rls.setArray(1, tables);
                try (ResultSet result = rls.executeQuery()) {
                    result.next();
                    require(result.getInt(1) == 4,
                            "RLS is not forced on all tenant tables");
                }
            }

            try (PreparedStatement privilege = admin.prepareStatement(
                    "select has_schema_privilege(?, 'public', 'CREATE')")) {
                privilege.setString(1, appUser);
                try (ResultSet result = privilege.executeQuery()) {
                    result.next();
                    require(!result.getBoolean(1),
                            "Application role can create schema objects");
                }
            }
        }

        try (Connection application = DriverManager.getConnection(
                url,
                appUser,
                required(env, "DB_APP_PASSWORD"));
             Statement statement = application.createStatement()) {
            statement.execute(
                    "select set_config('app.current_user_id', '-1', false)");
            for (String table : List.of(
                    "categories",
                    "movements",
                    "budgets",
                    "saving_goals")) {
                try (ResultSet result = statement.executeQuery(
                        "select count(*) from " + table)) {
                    result.next();
                    require(result.getLong(1) == 0,
                            "RLS exposed rows from " + table);
                }
            }
        }

        System.out.println(
                "PASS rls-force least-privilege no-bypass tenant-isolation");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalStateException(message);
        }
    }

    private static Map<String, String> readEnv(Path path) throws Exception {
        Map<String, String> values = new HashMap<>();
        for (String line : Files.readAllLines(path)) {
            if (!line.isBlank() && !line.startsWith("#") && line.contains("=")) {
                int separator = line.indexOf('=');
                values.put(
                        line.substring(0, separator),
                        line.substring(separator + 1)
                );
            }
        }
        return values;
    }

    private static String required(Map<String, String> env, String name) {
        String value = env.get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing " + name);
        }
        return value;
    }
}
