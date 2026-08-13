package com.equio.backend.savings.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.budgets.services.BudgetService;
import com.equio.backend.savings.dto.requests.FundRequest;
import com.equio.backend.savings.dto.requests.SavingGoalRequest;
import com.equio.backend.savings.dto.responses.SavingGoalResponse;
import com.equio.backend.savings.entities.SavingGoal;
import com.equio.backend.savings.repositories.SavingGoalRepository;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SavingGoalServiceImpl implements SavingGoalService {

    private final SavingGoalRepository savingGoalRepository;
    private final UserRepository userRepository;
    private final BudgetRepository budgetRepository;
    private final MovementRepository movementRepository;
    private final BudgetService budgetService;
    private final RlsContext rlsContext;

    public SavingGoalServiceImpl(SavingGoalRepository savingGoalRepository,
                                 UserRepository userRepository,
                                 BudgetRepository budgetRepository,
                                 MovementRepository movementRepository,
                                 @Lazy BudgetService budgetService,
                                 RlsContext rlsContext) {
        this.savingGoalRepository = savingGoalRepository;
        this.userRepository = userRepository;
        this.budgetRepository = budgetRepository;
        this.movementRepository = movementRepository;
        this.budgetService = budgetService;
        this.rlsContext = rlsContext;
    }

    @Override
    @Transactional
    public SavingGoalResponse create(Long userId, SavingGoalRequest request) {
        rlsContext.setUserId(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        SavingGoal goal = new SavingGoal();
        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setCurrentAmount(BigDecimal.ZERO);
        goal.setDeadline(request.deadline());
        goal.setTag(request.tag());
        goal.setImageUrl(request.imageUrl());
        goal.setUser(user);

        if (request.budgetId() != null) {
            Budget budget = budgetRepository.findByIdAndUserId(request.budgetId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Budget"));
            goal.setBudget(budget);
        }

        return toResponse(savingGoalRepository.save(goal));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavingGoalResponse> getAllByUser(Long userId) {
        rlsContext.setUserId(userId);
        return savingGoalRepository.findByUserId(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SavingGoalResponse getById(Long userId, Long goalId) {
        rlsContext.setUserId(userId);
        return toResponse(findGoalAndValidateOwner(userId, goalId));
    }

    @Override
    @Transactional
    public SavingGoalResponse update(Long userId, Long goalId, SavingGoalRequest request) {
        rlsContext.setUserId(userId);
        SavingGoal goal = findGoalAndValidateOwner(userId, goalId);

        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setDeadline(request.deadline());
        goal.setTag(request.tag());
        goal.setImageUrl(request.imageUrl());

        if (request.budgetId() != null) {
            Budget budget = budgetRepository.findByIdAndUserId(request.budgetId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Budget"));
            goal.setBudget(budget);
        } else {
            goal.setBudget(null);
        }

        return toResponse(savingGoalRepository.save(goal));
    }

    /**
     * ADD: Suma amount a currentAmount. No puede superar targetAmount.
     * WITHDRAW: Resta amount de currentAmount. No puede quedar negativo.
     */
    @Override
    @Transactional
    public SavingGoalResponse addOrWithdrawFund(Long userId, Long goalId, FundRequest request) {
        rlsContext.setUserId(userId);
        SavingGoal goal = findGoalAndValidateOwner(userId, goalId);

        String operation = request.operation().toUpperCase();
        User user = goal.getUser();
        Category goalCategory = goal.getBudget() != null ? goal.getBudget().getCategory() : null;

        if ("ADD".equals(operation)) {
            BigDecimal newAmount = goal.getCurrentAmount().add(request.amount());
            if (newAmount.compareTo(goal.getTargetAmount()) > 0) {
                throw new IllegalArgumentException(
                        "El aporte supera la meta. Máximo a aportar: " +
                        goal.getTargetAmount().subtract(goal.getCurrentAmount())
                );
            }
            goal.setCurrentAmount(newAmount);

            Movement movement = new Movement();
            movement.setUser(user);
            movement.setAmount(request.amount());
            movement.setType(MovementType.EXPENSE);
            movement.setDescription("Aporte a meta: " + goal.getName());
            movement.setDate(LocalDateTime.now());
            movement.setCategory(goalCategory);
            movementRepository.save(movement);

            Long catId = goalCategory != null ? goalCategory.getId() : null;
            budgetService.addExpense(userId, catId, request.amount());

        } else if ("WITHDRAW".equals(operation)) {
            if (request.amount().compareTo(goal.getCurrentAmount()) > 0) {
                throw new IllegalArgumentException(
                        "No puedes retirar más de lo ahorrado. Máximo a retirar: " + goal.getCurrentAmount()
                );
            }
            goal.setCurrentAmount(goal.getCurrentAmount().subtract(request.amount()));

            Movement movement = new Movement();
            movement.setUser(user);
            movement.setAmount(request.amount());
            movement.setType(MovementType.INCOME);
            movement.setDescription("Retiro de meta: " + goal.getName());
            movement.setDate(LocalDateTime.now());
            movement.setCategory(goalCategory);
            movementRepository.save(movement);

        } else {
            throw new IllegalArgumentException("Operación inválida. Use 'ADD' o 'WITHDRAW'");
        }

        return toResponse(savingGoalRepository.save(goal));
    }

    @Override
    @Transactional
    public void delete(Long userId, Long goalId) {
        rlsContext.setUserId(userId);
        SavingGoal goal = findGoalAndValidateOwner(userId, goalId);
        savingGoalRepository.delete(goal);
    }


    private SavingGoal findGoalAndValidateOwner(Long userId, Long goalId) {
        return savingGoalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Saving goal"));
    }

    private SavingGoalResponse toResponse(SavingGoal goal) {
        BigDecimal target = goal.getTargetAmount();
        BigDecimal current = goal.getCurrentAmount();
        BigDecimal remaining = target.subtract(current);

        double progress = 0.0;
        if (target.compareTo(BigDecimal.ZERO) > 0) {
            progress = current.divide(target, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .doubleValue();
        }

        boolean completed = current.compareTo(target) >= 0;

        return new SavingGoalResponse(
                goal.getId(),
                goal.getName(),
                target,
                current,
                remaining,
                progress,
                goal.getDeadline(),
                completed,
                goal.getBudget() != null ? goal.getBudget().getId() : null,
                goal.getBudget() != null ? goal.getBudget().getName() : null,
                goal.getCreatedAt() != null
                        ? goal.getCreatedAt().toInstant()
                                .atZone(java.time.ZoneId.systemDefault())
                                .toLocalDateTime()
                        : null,
                goal.getTag(),
                goal.getImageUrl()
        );
    }
}
