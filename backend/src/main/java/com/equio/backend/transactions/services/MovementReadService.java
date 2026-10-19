package com.equio.backend.transactions.services;

import com.equio.backend.shared.exceptions.ResultSetTooLargeException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.dto.responses.MovementPageResponse;
import com.equio.backend.transactions.dto.responses.MovementResponse;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.repositories.MovementRepository;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@Transactional(readOnly = true)
public class MovementReadService {
    private static final Sort ORDER = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"));
    private final MovementRepository repository;
    private final RlsContext rlsContext;
    private final int maxQueryResults;

    public MovementReadService(MovementRepository repository, RlsContext rlsContext,
            @Value("${app.movements.max-query-results:5000}") int maxQueryResults) {
        if (maxQueryResults < 100 || maxQueryResults > 10_000) {
            throw new IllegalStateException("Movement query result limit must be between 100 and 10000");
        }
        this.repository = repository;
        this.rlsContext = rlsContext;
        this.maxQueryResults = maxQueryResults;
    }

    public MovementPageResponse findPage(Long userId, String type, Long categoryId,
            LocalDate startDate, LocalDate endDate, LocalDateTime startAt,
            LocalDateTime beforeDate, Long beforeId, int size) {
        if (size < 1 || size > 100) throw new IllegalArgumentException("Page size must be between 1 and 100");
        if ((beforeDate == null) != (beforeId == null) || (beforeId != null && beforeId <= 0)) {
            throw new IllegalArgumentException("Both cursor fields are required");
        }
        rlsContext.setUserId(userId);
        var specification = filters(userId, type, categoryId, startDate, endDate, startAt);
        if (beforeDate != null) {
            specification = specification.and((root, query, builder) -> builder.or(
                    builder.lessThan(root.get("date"), beforeDate),
                    builder.and(builder.equal(root.get("date"), beforeDate),
                            builder.lessThan(root.get("id"), beforeId))));
        }
        // A keyset cursor avoids OFFSET scans and COUNT(*) on every history page.
        var rows = repository.findBy(specification, query -> query.sortBy(ORDER).limit(size + 1).all());
        var items = rows.stream().limit(size).map(MovementReadService::toResponse).toList();
        MovementPageResponse.Cursor next = rows.size() > size
                ? new MovementPageResponse.Cursor(rows.get(size - 1).getDate(), rows.get(size - 1).getId()) : null;
        return new MovementPageResponse(items, next);
    }

    public List<MovementResponse> findAll(Long userId, String type, Long categoryId,
            LocalDate startDate, LocalDate endDate, LocalDateTime startAt) {
        rlsContext.setUserId(userId);
        var specification = filters(userId, type, categoryId, startDate, endDate, startAt);
        var rows = repository.findBy(specification, query -> query.sortBy(ORDER).limit(maxQueryResults + 1).all());
        if (rows.size() > maxQueryResults) throw new ResultSetTooLargeException(maxQueryResults);
        return rows.stream().map(MovementReadService::toResponse).toList();
    }

    public List<LocalDate> findDates(Long userId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || startDate.isAfter(endDate)
                || ChronoUnit.DAYS.between(startDate, endDate) > 61) {
            throw new IllegalArgumentException("Calendar range must span at most 62 days");
        }
        rlsContext.setUserId(userId);
        return repository.findMovementDates(userId, startDate.atStartOfDay(), endDate.atTime(LocalTime.MAX));
    }

    private static Specification<Movement> filters(Long userId, String type, Long categoryId,
            LocalDate startDate, LocalDate endDate, LocalDateTime startAt) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }
        if (startAt != null && (startDate == null || !startAt.toLocalDate().equals(startDate))) {
            throw new IllegalArgumentException("The precise start must belong to the requested start date");
        }
        MovementType movementType = type == null ? null : MovementType.valueOf(type.toUpperCase(Locale.ROOT));
        return (root, query, builder) -> {
            root.fetch("category", JoinType.LEFT);
            var predicates = new ArrayList<Predicate>();
            predicates.add(builder.equal(root.get("user").get("id"), userId));
            if (movementType != null) predicates.add(builder.equal(root.get("type"), movementType));
            if (categoryId != null) predicates.add(builder.equal(root.get("category").get("id"), categoryId));
            if (startDate != null) predicates.add(builder.greaterThanOrEqualTo(root.get("date"),
                    startAt != null ? startAt : startDate.atStartOfDay()));
            if (endDate != null) predicates.add(builder.lessThanOrEqualTo(root.get("date"), endDate.atTime(LocalTime.MAX)));
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    static MovementResponse toResponse(Movement movement) {
        var category = movement.getCategory();
        return new MovementResponse(movement.getId(), movement.getAmount(), movement.getType().name(),
                movement.getDescription(), movement.getDate(), category != null ? category.getId() : null,
                category != null ? category.getName() : null, category != null ? category.getColor() : null,
                category != null ? category.getIcon() : null,
                movement.getCreatedAt() != null ? movement.getCreatedAt().toInstant()
                        .atZone(java.time.ZoneId.systemDefault()).toLocalDateTime() : null,
                movement.getSource().name());
    }
}
