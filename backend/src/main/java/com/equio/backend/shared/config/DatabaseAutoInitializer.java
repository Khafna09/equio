package com.equio.backend.shared.config;

import org.slf4j.*;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

import java.sql.*;

@Configuration
@ConditionalOnProperty(
        name = "app.security.database-auto-create-enabled",
        havingValue = "true"
)
public class DatabaseAutoInitializer {
    private static final Logger LOGGER =
            LoggerFactory.getLogger(DatabaseAutoInitializer.class);
    private static final String DATABASE_NAME_PATTERN = "[A-Za-z0-9_]+";

    @Bean
    static BeanFactoryPostProcessor databaseInitializer() {
        return beanFactory -> {
            Environment environment = beanFactory.getBean(Environment.class);
            String dbUrl = environment.getRequiredProperty("spring.datasource.url");
            String username = environment.getRequiredProperty("spring.flyway.user");
            String password = environment.getRequiredProperty("spring.flyway.password");

            int lastSlashIndex = dbUrl.lastIndexOf('/');
            if (lastSlashIndex < 0) {
                throw new IllegalStateException("Unsupported PostgreSQL JDBC URL");
            }

            String baseUrl = dbUrl.substring(0, lastSlashIndex + 1) + "postgres";
            String dbName = dbUrl.substring(lastSlashIndex + 1).split("\\?", 2)[0];
            if (!dbName.matches(DATABASE_NAME_PATTERN)) {
                throw new IllegalStateException("Database name contains unsupported characters");
            }

            try (Connection connection =
                         DriverManager.getConnection(baseUrl, username, password);
                 PreparedStatement exists = connection.prepareStatement(
                         "select 1 from pg_database where datname = ?")) {
                exists.setString(1, dbName);
                try (ResultSet result = exists.executeQuery()) {
                    if (result.next()) {
                        return;
                    }
                }
                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("create database \"" + dbName + "\"");
                    LOGGER.info("Development database created");
                }
            } catch (SQLException exception) {
                throw new IllegalStateException(
                        "Could not create the development database", exception);
            }
        };
    }
}
