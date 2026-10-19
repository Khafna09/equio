package com.equio.backend.savings.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.services.BudgetLookupService;
import com.equio.backend.savings.dto.requests.FundRequest;
import com.equio.backend.savings.dto.requests.SavingGoalRequest;
import com.equio.backend.savings.dto.responses.SavingGoalResponse;
import com.equio.backend.savings.entities.SavingGoal;
import com.equio.backend.savings.repositories.SavingGoalRepository;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.dto.requests.CreateMovementRequest;
import com.equio.backend.transactions.services.CreateMovementService;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserLookupService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SavingGoalServiceImpl implements SavingGoalService {

    private final SavingGoalRepository savingGoalRepository;
    private final UserLookupService userLookupService;
    private final BudgetLookupService budgetLookupService;
    private final CreateMovementService createMovementService;
    private final RlsContext rlsContext;
    private final FinancialConcurrencyGuard concurrencyGuard;

    public SavingGoalServiceImpl(SavingGoalRepository savingGoalRepository,
                                 UserLookupService userLookupService,
                                 BudgetLookupService budgetLookupService,
                                 CreateMovementService createMovementService,
                                 RlsContext rlsContext,
                                 FinancialConcurrencyGuard concurrencyGuard) {
        this.savingGoalRepository = savingGoalRepository;
        this.userLookupService = userLookupService;
        this.budgetLookupService = budgetLookupService;
        this.createMovementService = createMovementService;
        this.rlsContext = rlsContext;
        this.concurrencyGuard = concurrencyGuard;
    }

    @Override
    @Transactional
    public SavingGoalResponse create(Long userId, SavingGoalRequest request) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        User user = userLookupService.requireUser(userId);

        SavingGoal goal = new SavingGoal();
        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setCurrentAmount(BigDecimal.ZERO);
        goal.setDeadline(request.deadline());
        goal.setTag(request.tag());
        goal.setImageUrl(request.imageUrl());
        goal.setUser(user);

        if (request.budgetId() != null) {
            Budget budget = budgetLookupService.requireOwnedBudget(userId, request.budgetId());
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
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        SavingGoal goal = findGoalAndValidateOwner(userId, goalId);
        if (request.targetAmount().compareTo(goal.getCurrentAmount()) < 0) {
            throw new IllegalArgumentException(
                    "The target amount cannot be lower than the current saved amount");
        }

        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setDeadline(request.deadline());
        goal.setTag(request.tag());
        goal.setImageUrl(request.imageUrl());

        if (request.budgetId() != null) {
            Budget budget = budgetLookupService.requireOwnedBudget(userId, request.budgetId());
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
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        SavingGoal goal = findGoalAndValidateOwner(userId, goalId);

        String operation = request.operation().toUpperCase();
        Long goalCategoryId = goal.getBudget() != null && goal.getBudget().getCategory() != null
                ? goal.getBudget().getCategory().getId()
                : null;

        if ("ADD".equals(operation)) {
            BigDecimal newAmount = goal.getCurrentAmount().add(request.amount());
            if (newAmount.compareTo(goal.getTargetAmount()) > 0) {
                throw new IllegalArgumentException(
                        "El aporte supera la meta. Máximo a aportar: " +
                        goal.getTargetAmount().subtract(goal.getCurrentAmount())
                );
            }
            goal.setCurrentAmount(newAmount);

            createMovementService.createGoalMovement(userId, goalId, goal.getName(), new CreateMovementRequest(
                    request.amount(),
                    MovementType.EXPENSE,
                    "Aporte a meta: " + goal.getName(),
                    LocalDateTime.now(),
                    goalCategoryId));

        } else if ("WITHDRAW".equals(operation)) {
            if (request.amount().compareTo(goal.getCurrentAmount()) > 0) {
                throw new IllegalArgumentException(
                        "No puedes retirar más de lo ahorrado. Máximo a retirar: " + goal.getCurrentAmount()
                );
            }
            goal.setCurrentAmount(goal.getCurrentAmount().subtract(request.amount()));

            createMovementService.createGoalMovement(userId, goalId, goal.getName(), new CreateMovementRequest(
                    request.amount(),
                    MovementType.INCOME,
                    "Retiro de meta: " + goal.getName(),
                    LocalDateTime.now(),
                    goalCategoryId));

        } else {
            throw new IllegalArgumentException("Operación inválida. Use 'ADD' o 'WITHDRAW'");
        }

        return toResponse(savingGoalRepository.save(goal));
    }

    @Override
    @Transactional
    public void delete(Long userId, Long goalId) {
        concurrencyGuard.lock(userId);
        rlsContext.setUserId(userId);
        SavingGoal goal = findGoalAndValidateOwner(userId, goalId);
        if (goal.getCurrentAmount().signum() > 0) {
            throw new BusinessConflictException("GOAL_HAS_FUNDS",
                    "Withdraw the remaining goal funds before deleting it.");
        }
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
