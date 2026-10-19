package com.equio.backend.shared.security;

import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RlsContext {
    private final EntityManager entityManager;
    private final boolean enabled;

    public RlsContext(
            EntityManager entityManager,
            @Value("${app.security.rls-enabled:true}") boolean enabled
    ) {
        this.entityManager = entityManager;
        this.enabled = enabled;
    }

    public void setUserId(Long userId) {
        if (!enabled) {
            return;
        }
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("A valid authenticated user is required.");
        }
        entityManager.createNativeQuery(
                        "select set_config('app.current_user_id', :userId, true)")
                .setParameter("userId", userId.toString())
                .getSingleResult();
    }
}
