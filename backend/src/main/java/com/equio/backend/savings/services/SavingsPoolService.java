package com.equio.backend.savings.services;

import com.equio.backend.budgets.services.BudgetFundingService;
import com.equio.backend.savings.dto.responses.SavingsPoolResponse;
import com.equio.backend.savings.entities.SavingGoal;
import com.equio.backend.savings.entities.SavingsPool;
import com.equio.backend.savings.entities.SavingsPoolTransaction;
import com.equio.backend.savings.entities.enums.SavingsPoolTransactionType;
import com.equio.backend.savings.repositories.SavingGoalRepository;
import com.equio.backend.savings.repositories.SavingsPoolRepository;
import com.equio.backend.savings.repositories.SavingsPoolTransactionRepository;
import com.equio.backend.shared.events.BudgetSavingsSettlementEvent;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserLookupService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Service
public class SavingsPoolService {
    private final SavingsPoolRepository poolRepository;
    private final SavingsPoolTransactionRepository transactionRepository;
    private final SavingGoalRepository goalRepository;
    private final UserLookupService userLookupService;
    private final BudgetFundingService budgetFundingService;
    private final RlsContext rlsContext;
    private final SavingsPoolConcurrencyGuard concurrencyGuard;

    public SavingsPoolService(SavingsPoolRepository poolRepository,
                              SavingsPoolTransactionRepository transactionRepository,
                              SavingGoalRepository goalRepository,
                              UserLookupService userLookupService,
                              BudgetFundingService budgetFundingService,
                              RlsContext rlsContext,
                              SavingsPoolConcurrencyGuard concurrencyGuard) {
        this.poolRepository = poolRepository;
        this.transactionRepository = transactionRepository;
        this.goalRepository = goalRepository;
        this.userLookupService = userLookupService;
        this.budgetFundingService = budgetFundingService;
        this.rlsContext = rlsContext;
        this.concurrencyGuard = concurrencyGuard;
    }

    @Transactional(readOnly = true)
    public SavingsPoolResponse get(Long userId) {
        rlsContext.setUserId(userId);
        return poolRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseGet(() -> new SavingsPoolResponse(BigDecimal.ZERO, null));
    }

    @Transactional
    public void creditBudgetClosure(BudgetSavingsSettlementEvent event) {
        rlsContext.setUserId(event.userId());
        if (event.totalAmount().signum() <= 0) {
            return;
        }
        concurrencyGuard.lock(event.userId());
        if (transactionRepository
                .existsByUserIdAndTypeAndBudgetId(event.userId(),
                        SavingsPoolTransactionType.BUDGET_CLOSURE_DEPOSIT, event.budgetId())) {
            return;
        }
        User user = userLookupService.requireUser(event.userId());
        SavingsPool pool = findOrCreatePool(user);
        pool.setBalance(pool.getBalance().add(event.totalAmount()));
        poolRepository.save(pool);
        record(pool, user, SavingsPoolTransactionType.BUDGET_CLOSURE_DEPOSIT,
                event.totalAmount(), event.budgetId(), null);
    }

    @Transactional
    public SavingsPoolResponse transferToGoal(Long userId, Long goalId, BigDecimal amount) {
        rlsContext.setUserId(userId);
        concurrencyGuard.lock(userId);
        SavingsPool pool = requirePoolForDebit(userId, amount);
        SavingGoal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Saving goal"));
        BigDecimal remaining = goal.getTargetAmount().subtract(goal.getCurrentAmount());
        if (amount.compareTo(remaining) > 0) {
            throw new BusinessConflictException("The transfer exceeds the remaining goal amount");
        }
        goal.setCurrentAmount(goal.getCurrentAmount().add(amount));
        pool.setBalance(pool.getBalance().subtract(amount));
        goalRepository.save(goal);
        poolRepository.save(pool);
        record(pool, goal.getUser(), SavingsPoolTransactionType.TRANSFER_TO_GOAL,
                amount, null, goalId);
        return toResponse(pool);
    }

    @Transactional
    public SavingsPoolResponse transferToBudget(Long userId, Long budgetId, BigDecimal amount) {
        rlsContext.setUserId(userId);
        concurrencyGuard.lock(userId);
        SavingsPool pool = requirePoolForDebit(userId, amount);
        budgetFundingService.increaseFromSavingsPool(userId, budgetId, amount);
        pool.setBalance(pool.getBalance().subtract(amount));
        poolRepository.save(pool);
        record(pool, pool.getUser(), SavingsPoolTransactionType.TRANSFER_TO_BUDGET,
                amount, budgetId, null);
        return toResponse(pool);
    }

    private SavingsPool requirePoolForDebit(Long userId, BigDecimal amount) {
        SavingsPool pool = poolRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new BusinessConflictException("The savings pool has no available balance"));
        if (pool.getBalance().compareTo(amount) < 0) {
            throw new BusinessConflictException("Insufficient savings pool balance");
        }
        return pool;
    }

    private SavingsPool findOrCreatePool(User user) {
        return poolRepository.findByUserIdForUpdate(user.getId()).orElseGet(() -> {
            SavingsPool pool = new SavingsPool();
            pool.setUser(user);
            return poolRepository.save(pool);
        });
    }

    private void record(SavingsPool pool, User user, SavingsPoolTransactionType type,
                        BigDecimal amount, Long budgetId, Long goalId) {
        SavingsPoolTransaction transaction = new SavingsPoolTransaction();
        transaction.setPool(pool);
        transaction.setUser(user);
        transaction.setType(type);
        transaction.setAmount(amount);
        transaction.setBalanceAfter(pool.getBalance());
        transaction.setBudgetId(budgetId);
        transaction.setSavingGoalId(goalId);
        transactionRepository.save(transaction);
    }

    private SavingsPoolResponse toResponse(SavingsPool pool) {
        Instant updatedAt = pool.getUpdatedAt() == null ? null : pool.getUpdatedAt().toInstant();
        return new SavingsPoolResponse(pool.getBalance(), updatedAt);
    }
}
