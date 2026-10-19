package com.equio.backend.transactions.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.events.ExpenseRecordedEvent;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.shared.events.MovementWriteRequestedEvent;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.transactions.entities.enums.MovementSource;
import com.equio.backend.transactions.dto.requests.CreateMovementRequest;
import com.equio.backend.transactions.dto.responses.MovementResponse;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.entities.Movement;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.repositories.CategoryRepository;
import com.equio.backend.transactions.repositories.MovementRepository;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserLookupService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CreateMovementServiceImpl implements CreateMovementService {

    private final MovementRepository movementRepository;
    private final UserLookupService userLookupService;
    private final CategoryRepository categoryRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RlsContext rlsContext;
    private final MovementReadService movementReadService;
    private final FinancialConcurrencyGuard concurrencyGuard;

    public CreateMovementServiceImpl(MovementRepository movementRepository,
                                     UserLookupService userLookupService,
                                     CategoryRepository categoryRepository,
                                     ApplicationEventPublisher eventPublisher,
                                     RlsContext rlsContext,
                                     MovementReadService movementReadService,
                                     FinancialConcurrencyGuard concurrencyGuard) {
        this.movementRepository = movementRepository;
        this.userLookupService = userLookupService;
        this.categoryRepository = categoryRepository;
        this.eventPublisher = eventPublisher;
        this.rlsContext = rlsContext;
        this.movementReadService = movementReadService;
        this.concurrencyGuard = concurrencyGuard;
    }

    @Override
    @Transactional
    public MovementResponse createMovement(Long userId, CreateMovementRequest createMovementRequest) {
        return create(userId, createMovementRequest, null, null);
    }

    @Override
    @Transactional
    public MovementResponse createGoalMovement(Long userId, Long goalId, String goalName,
                                              CreateMovementRequest request) {
        if (goalId == null || goalName == null || goalName.isBlank()) {
            throw new IllegalArgumentException("A goal reference is required");
        }
        return create(userId, request, goalId, goalName);
    }

    private MovementResponse create(Long userId, CreateMovementRequest createMovementRequest,
                                    Long goalId, String goalName) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        validatePeriod(userId, createMovementRequest.date(), createMovementRequest.categoryId());
        User user = userLookupService.requireUser(userId);

        Movement movement = new Movement();
        movement.setAmount(createMovementRequest.amount());
        movement.setType(createMovementRequest.type());
        movement.setDescription(createMovementRequest.description());
        movement.setDate(createMovementRequest.date());
        if (goalId != null) {
            movement.setSource(createMovementRequest.type() == MovementType.EXPENSE
                    ? MovementSource.GOAL_CONTRIBUTION : MovementSource.GOAL_WITHDRAWAL);
            movement.setSourceGoalId(goalId);
            movement.setSourceGoalName(goalName);
        }
        if (createMovementRequest.categoryId() != null) {
            Category category = categoryRepository.findByIdAndUserId(createMovementRequest.categoryId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category"));
            movement.setCategory(category);
        }

        movement.setUser(user);

        Movement savedMovement = movementRepository.save(movement);
        if (savedMovement.getType() == MovementType.EXPENSE) {
            Long catId = savedMovement.getCategory() != null ? savedMovement.getCategory().getId() : null;
            eventPublisher.publishEvent(new ExpenseRecordedEvent(
                    userId, catId, savedMovement.getAmount()));
        }

        return toResponse(savedMovement);
    }

    @Override
    @Transactional
    public MovementResponse updateMovement(Long userId, Long movementId, CreateMovementRequest createMovementRequest) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        requireManual(movement);
        validatePeriod(userId, movement.getDate(), movement.getCategory() == null ? null : movement.getCategory().getId());
        validatePeriod(userId, createMovementRequest.date(), createMovementRequest.categoryId());
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
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        requireManual(movement);
        validatePeriod(userId, movement.getDate(), movement.getCategory() == null ? null : movement.getCategory().getId());
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
        return getAllByFilters(userId, type, categoryId, startDate, endDate, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovementResponse> getAllByFilters(Long userId, String type, Long categoryId,
                                                java.time.LocalDate startDate, java.time.LocalDate endDate,
                                                java.time.LocalDateTime startAt) {
        return movementReadService.findAll(userId, type, categoryId, startDate, endDate, startAt);
    }

    private Movement findMovementAndValidationOwner(Long userId, Long movementId) {
        return movementRepository.findByIdAndUserId(movementId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Movement"));
    }

    private void validatePeriod(Long userId, java.time.LocalDateTime date, Long categoryId) {
        eventPublisher.publishEvent(new MovementWriteRequestedEvent(userId, date, categoryId));
    }

    private void requireManual(Movement movement) {
        if (movement.getSource() != MovementSource.MANUAL) {
            throw new BusinessConflictException("MOVEMENT_MANAGED_BY_GOAL",
                    "Goal transfers must be managed from the savings goal, not the movement editor.");
        }
    }

    private MovementResponse toResponse(Movement movement) {
        return MovementReadService.toResponse(movement);
    }
}
