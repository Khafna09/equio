package com.equio.backend.transactions.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.exceptions.ResultSetTooLargeException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.budgets.services.BudgetService;
import com.equio.backend.transactions.dto.requests.CreateMovementRequest;
import com.equio.backend.transactions.dto.responses.MovementResponse;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.repositories.CategoryRepository;
import com.equio.backend.transactions.repositories.MovementRepository;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.repositories.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import java.util.ArrayList;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class CreateMovementServiceImpl implements CreateMovementService {

    private final MovementRepository movementRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetService budgetService;
    private final RlsContext rlsContext;
    private final int maxQueryResults;

    public CreateMovementServiceImpl(MovementRepository movementRepository,
                                     UserRepository userRepository,
                                     CategoryRepository categoryRepository,
                                     @Lazy BudgetService budgetService,
                                     RlsContext rlsContext,
                                     @Value("${app.movements.max-query-results:5000}") int maxQueryResults) {
        if (maxQueryResults < 100 || maxQueryResults > 10_000) {
            throw new IllegalStateException(
                    "Movement query result limit must be between 100 and 10000");
        }
        this.movementRepository = movementRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.budgetService = budgetService;
        this.rlsContext = rlsContext;
        this.maxQueryResults = maxQueryResults;
    }

    @Override
    @Transactional
    public MovementResponse createMovement(Long userId, CreateMovementRequest createMovementRequest) {
        rlsContext.setUserId(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User"));

        Movement movement = new Movement();
        movement.setAmount(createMovementRequest.amount());
        movement.setType(createMovementRequest.type());
        movement.setDescription(createMovementRequest.description());
        movement.setDate(createMovementRequest.date());
        if (createMovementRequest.categoryId() != null) {
            Category category = categoryRepository.findByIdAndUserId(createMovementRequest.categoryId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category"));
            movement.setCategory(category);
        }

        movement.setUser(user);

        Movement savedMovement = movementRepository.save(movement);
        if (savedMovement.getType() == MovementType.EXPENSE) {
            Long catId = savedMovement.getCategory() != null ? savedMovement.getCategory().getId() : null;
            budgetService.addExpense(userId, catId, savedMovement.getAmount());
        }

        return toResponse(savedMovement);
    }

    @Override
    @Transactional
    public MovementResponse updateMovement(Long userId, Long movementId, CreateMovementRequest createMovementRequest) {
        rlsContext.setUserId(userId);
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        movement.setAmount(createMovementRequest.amount());
        movement.setType(createMovementRequest.type());
        movement.setDescription(createMovementRequest.description());
        movement.setDate(createMovementRequest.date());
        
        if (createMovementRequest.categoryId() != null) {
            Category category = categoryRepository.findByIdAndUserId(createMovementRequest.categoryId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category"));
            movement.setCategory(category);
        } else {
            movement.setCategory(null);
        }

        return toResponse(movementRepository.save(movement));
    }

    @Override
    @Transactional
    public void deleteMovement(Long userId, Long movementId) {
        rlsContext.setUserId(userId);
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        movementRepository.delete(movement);
    }

    @Override
    @Transactional(readOnly = true)
    public MovementResponse getById(Long userId, Long movementId) {
        rlsContext.setUserId(userId);
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        return toResponse(movement);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovementResponse> getAllByFilters(Long userId, String type, Long categoryId, java.time.LocalDate startDate, java.time.LocalDate endDate) {
        rlsContext.setUserId(userId);
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }
        MovementType movementType = type == null
                ? null
                : MovementType.valueOf(type.toUpperCase(Locale.ROOT));
        Specification<Movement> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("user").get("id"), userId));

            if (movementType != null) {
                predicates.add(criteriaBuilder.equal(root.get("type"), movementType));
            }
            if (categoryId != null) {
                predicates.add(criteriaBuilder.equal(root.get("category").get("id"), categoryId));
            }
            if (startDate != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(
                        root.get("date"), startDate.atStartOfDay()));
            }
            if (endDate != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(
                        root.get("date"), endDate.atTime(23, 59, 59)));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };

        List<Movement> movements = movementRepository.findAll(
                specification,
                PageRequest.of(
                        0,
                        maxQueryResults + 1,
                        Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id")))
        ).getContent();
        if (movements.size() > maxQueryResults) {
            throw new ResultSetTooLargeException(maxQueryResults);
        }
        return movements.stream()
                .map(this::toResponse)
                .toList();
    }

    private Movement findMovementAndValidationOwner(Long userId, Long movementId) {
        return movementRepository.findByIdAndUserId(movementId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Movement"));
    }

    private MovementResponse toResponse(Movement movement) {
        return new MovementResponse(
                movement.getId(),
                movement.getAmount(),
                movement.getType().name(),
                movement.getDescription(),
                movement.getDate(),
                movement.getCategory() != null ? movement.getCategory().getId() : null,
                movement.getCategory() != null ? movement.getCategory().getName() : null,
                movement.getCategory() != null ? movement.getCategory().getColor() : null,
                movement.getCategory() != null ? movement.getCategory().getIcon() : null,
                movement.getCreatedAt() != null ? movement.getCreatedAt().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime() : null
        );
    }
}
