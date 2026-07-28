package com.equio.backend.transactions.services;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CreateMovementServiceImpl implements CreateMovementService {

    private final MovementRepository movementRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetService budgetService;

    public CreateMovementServiceImpl(MovementRepository movementRepository,
                                     UserRepository userRepository,
                                     CategoryRepository categoryRepository,
                                     @Lazy BudgetService budgetService) {
        this.movementRepository = movementRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.budgetService = budgetService;
    }

    @Override
    @Transactional
    public MovementResponse createMovement(Long userId, CreateMovementRequest createMovementRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Movement movement = new Movement();
        movement.setAmount(createMovementRequest.amount());
        movement.setType(createMovementRequest.type());
        movement.setDescription(createMovementRequest.description());
        movement.setDate(createMovementRequest.date());
        if (createMovementRequest.categoryId() != null) {
            Category category = categoryRepository.findByIdAndUserId(createMovementRequest.categoryId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
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
    @Transactional(readOnly = true)
    public List<MovementResponse> getAllByUserId(Long userId) {
        return movementRepository.findByUserId(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public MovementResponse updateMovement(Long userId, Long movementId, CreateMovementRequest createMovementRequest) {
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        movement.setAmount(createMovementRequest.amount());
        movement.setType(createMovementRequest.type());
        movement.setDescription(createMovementRequest.description());
        movement.setDate(createMovementRequest.date());
        
        if (createMovementRequest.categoryId() != null) {
            Category category = categoryRepository.findByIdAndUserId(createMovementRequest.categoryId(), userId)
                    .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            movement.setCategory(category);
        } else {
            movement.setCategory(null);
        }

        return toResponse(movementRepository.save(movement));
    }

    @Override
    @Transactional
    public void deleteMovement(Long userId, Long movementId) {
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        movementRepository.delete(movement);
    }

    @Override
    @Transactional(readOnly = true)
    public MovementResponse getById(Long userId, Long movementId) {
        Movement movement = findMovementAndValidationOwner(userId, movementId);
        return toResponse(movement);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovementResponse> getAllByFilters(Long userId, String type, Long categoryId, java.time.LocalDate startDate, java.time.LocalDate endDate) {
        return movementRepository.findByUserIdOrderByDateDescIdDesc(userId)
                .stream()
                .filter(m -> type == null || m.getType().name().equalsIgnoreCase(type))
                .filter(m -> categoryId == null || (m.getCategory() != null && m.getCategory().getId().equals(categoryId)))
                .filter(m -> startDate == null || !m.getDate().toLocalDate().isBefore(startDate))
                .filter(m -> endDate == null || !m.getDate().toLocalDate().isAfter(endDate))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovementResponse> getAllByCategory(Long userId, Long categoryId) {
        return List.of(); 
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovementResponse> getAllByDateRange(Long userId, String startDate, String endDate) {
        return List.of(); 
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovementResponse> getAllByType(Long userId, String type) {
        return List.of(); 
    }

    private Movement findMovementAndValidationOwner(Long userId, Long movementId) {
        Movement movement = movementRepository.findById(movementId)
                .orElseThrow(() -> new IllegalArgumentException("Movement not found with ID: " + movementId));
        if (!movement.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("User not owned by this movement");
        }
        return movement;
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
