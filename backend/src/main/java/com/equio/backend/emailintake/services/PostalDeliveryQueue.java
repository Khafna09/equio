package com.equio.backend.emailintake.services;

import com.equio.backend.shared.security.RlsContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class PostalDeliveryQueue {
    private final JdbcClient jdbc;
    private final RlsContext rls;

    public PostalDeliveryQueue(JdbcClient jdbc, RlsContext rls) {
        this.jdbc = jdbc;
        this.rls = rls;
    }

    @Transactional
    public void enqueue(long owner, UUID inbox, UUID emailId) {
        rls.setUserId(owner);
        jdbc.sql("""
                INSERT INTO postal_email_deliveries (user_id, inbox_id, email_id)
                VALUES (?, ?, ?) ON CONFLICT DO NOTHING
                """).param(owner).param(inbox).param(emailId).update();
    }

    @Transactional
    public Optional<Claim> claim(long owner, UUID inbox) {
        rls.setUserId(owner);
        jdbc.sql("""
                UPDATE postal_email_deliveries SET state = 'FAILED'
                WHERE user_id = ? AND inbox_id = ? AND state = 'QUEUED'
                  AND attempts = 5 AND available_at <= CURRENT_TIMESTAMP
                """).param(owner).param(inbox).update();
        return jdbc.sql("""
                WITH next AS (
                    SELECT email_id FROM postal_email_deliveries
                    WHERE user_id = ? AND inbox_id = ? AND state = 'QUEUED'
                      AND attempts < 5 AND available_at <= CURRENT_TIMESTAMP
                    ORDER BY available_at, email_id LIMIT 1 FOR UPDATE SKIP LOCKED
                )
                UPDATE postal_email_deliveries AS delivery
                SET attempts = attempts + 1, available_at = CURRENT_TIMESTAMP + INTERVAL '2 minutes'
                FROM next WHERE user_id = ? AND inbox_id = ? AND delivery.email_id = next.email_id
                RETURNING delivery.email_id, delivery.attempts
                """).param(owner).param(inbox).param(owner).param(inbox)
                .query((rs, index) -> new Claim(rs.getObject(1, UUID.class), rs.getInt(2))).optional();
    }

    @Transactional
    public void finish(long owner, UUID inbox, Claim claim, EmailCandidateService.Result result) {
        rls.setUserId(owner);
        jdbc.sql("""
                UPDATE postal_email_deliveries SET state = ?
                WHERE user_id = ? AND inbox_id = ? AND email_id = ? AND state = 'QUEUED' AND attempts = ?
                """).param(result.name()).param(owner).param(inbox).param(claim.emailId()).param(claim.attempt()).update();
    }

    public record Claim(UUID emailId, int attempt) {}

    @Transactional(readOnly = true)
    public long reviewCount(long owner) {
        rls.setUserId(owner);
        return jdbc.sql("""
                SELECT count(*) FROM postal_email_deliveries
                WHERE user_id = ? AND state IN ('NEEDS_REVIEW', 'FAILED')
                """).param(owner).query(Long.class).single();
    }
}
