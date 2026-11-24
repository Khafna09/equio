package com.equio.backend.emailintake.repositories;

import com.equio.backend.emailintake.domain.ExpenseDraft;
import com.equio.backend.emailintake.domain.ExpenseDraft.Status;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ExpenseDraftRepository {
    private static final String COLUMNS = "id, amount, currency, description, occurred_at, status, movement_id";
    private final JdbcClient jdbc;

    public ExpenseDraftRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public boolean insertIfNew(long userId, String fingerprint, ExpenseDraft draft) {
        return jdbc.sql("""
                INSERT INTO email_expense_drafts (id, user_id, delivery_fingerprint, amount, currency, description, occurred_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (user_id, delivery_fingerprint) DO NOTHING
                """)
                .param(draft.id()).param(userId).param(fingerprint).param(draft.amount()).param(draft.currency())
                .param(draft.description()).param(draft.occurredAt()).update() == 1;
    }

    public Optional<ExpenseDraft> find(long userId, UUID id) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM email_expense_drafts WHERE user_id = ? AND id = ?")
                .param(userId).param(id).query(ExpenseDraftRepository::map).optional();
    }

    public List<ExpenseDraft> findPending(long userId, int limit) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM email_expense_drafts WHERE user_id = ? AND status = 'PENDING'"
                        + " ORDER BY created_at DESC, id LIMIT ?")
                .param(userId).param(limit).query(ExpenseDraftRepository::map).list();
    }

    public boolean finishPending(long userId, UUID id, Status status, Long movementId) {
        return jdbc.sql("""
                UPDATE email_expense_drafts SET status = ?, movement_id = ?
                WHERE user_id = ? AND id = ? AND status = 'PENDING'
                """).param(status.name()).param(movementId).param(userId).param(id).update() == 1;
    }

    private static ExpenseDraft map(java.sql.ResultSet row, int index) throws java.sql.SQLException {
        return new ExpenseDraft(row.getObject("id", UUID.class), row.getBigDecimal("amount"), row.getString("currency"),
                row.getString("description"), row.getObject("occurred_at", LocalDateTime.class),
                Status.valueOf(row.getString("status")), row.getObject("movement_id", Long.class));
    }
}
