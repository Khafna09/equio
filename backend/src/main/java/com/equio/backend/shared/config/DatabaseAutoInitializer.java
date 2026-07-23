package com.equio.backend.shared.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

@Configuration
public class DatabaseAutoInitializer {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseAutoInitializer.class);
    private static final String DATABASE_NAME_PATTERN = "[A-Za-z0-9_]+";

    @Bean
    public static BeanFactoryPostProcessor databaseInitializer() {
        return beanFactory -> {
            try {
                Environment env = beanFactory.getBean(Environment.class);
                String dbUrl = env.getProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/equio");
                String username = env.getProperty("spring.datasource.username", "postgres");
                String password = env.getProperty("spring.datasource.password", "");

                int lastSlashIndex = dbUrl.lastIndexOf('/');
                if (lastSlashIndex != -1) {
                    String baseUrl = dbUrl.substring(0, lastSlashIndex + 1) + "postgres";
                    String dbName = dbUrl.substring(lastSlashIndex + 1);

                    if (dbName.contains("?")) {
                        dbName = dbName.substring(0, dbName.indexOf('?'));
                    }

                    if (!dbName.matches(DATABASE_NAME_PATTERN)) {
                        throw new IllegalArgumentException("Nombre de base de datos no permitido: " + dbName);
                    }

                    try (Connection conn = DriverManager.getConnection(baseUrl, username, password);
                         Statement stmt = conn.createStatement()) {

                        ResultSet rs = stmt.executeQuery("SELECT 1 FROM pg_database WHERE datname = '" + dbName + "'");
                        if (!rs.next()) {
                            stmt.executeUpdate("CREATE DATABASE \"" + dbName + "\"");
                            logger.info("Base de datos '{}' creada exitosamente en PostgreSQL.", dbName);
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("No se pudo verificar o crear la base de datos automaticamente: {}", e.getMessage());
            }
        };
    }
}