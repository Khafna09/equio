package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.users.repositories.UserRepository;
import org.slf4j.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class BudgetScheduler {
    private static final Logger LOGGER = LoggerFactory.getLogger(BudgetScheduler.class);

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final RlsContext rlsContext;

    public BudgetScheduler(
            BudgetRepository budgetRepository,
            UserRepository userRepository,
            RlsContext rlsContext
    ) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
        this.rlsContext = rlsContext;
    }

    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void processExpiredBudgets() {
        LocalDate today = LocalDate.now();
        for (Long userId : userRepository.findAllIds()) {
            rlsContext.setUserId(userId);
            var activeBudgets = budgetRepository
                    .findByUserIdAndStatus(userId, BudgetStatus.ACTIVE)
                    .stream()
                    .filter(budget -> budget.getParentBudget() == null)
                    .toList();

            for (Budget budget : activeBudgets) {
                if (budget.getEndDate() != null && budget.getEndDate().isBefore(today)) {
                    closeBudgetTree(budget);
                    budgetRepository.save(budget);
                    if (budget.isFixed()) {
                        renewBudgetTree(budget);
                    }
                }
            }
        }
        LOGGER.info("Expired budget processing completed");
    }

    private void closeBudgetTree(Budget budget) {
        budget.setStatus(BudgetStatus.CLOSED);
        for (Budget child : budget.getSubBudgets()) {
            if (child.getStatus() == BudgetStatus.ACTIVE) {
                child.setStatus(BudgetStatus.CLOSED);
                budgetRepository.save(child);
            }
        }
    }

    private void renewBudgetTree(Budget oldBudget) {
        LocalDate newStartDate = oldBudget.getNextStartDate() != null
                ? oldBudget.getNextStartDate()
                : oldBudget.getEndDate().plusDays(1);
        LocalDate newEndDate = newStartDate.plusMonths(1).minusDays(1);

        Budget newBudget = copyForRenewal(oldBudget, newStartDate, newEndDate);
        Budget savedNewBudget = budgetRepository.save(newBudget);

        for (Budget oldChild : oldBudget.getSubBudgets()) {
            Budget newChild = copyForRenewal(oldChild, newStartDate, newEndDate);
            newChild.setParentBudget(savedNewBudget);
            budgetRepository.save(newChild);
        }
    }

    private Budget copyForRenewal(
            Budget source,
            LocalDate startDate,
            LocalDate endDate
    ) {
        Budget target = new Budget();
        target.setName(source.getName());
        target.setTotalAmount(source.getTotalAmount());
        target.setFixed(true);
        target.setStartDate(startDate);
        target.setEndDate(endDate);
        target.setCategory(source.getCategory());
        target.setUser(source.getUser());
        target.setStatus(BudgetStatus.ACTIVE);
        target.setSavingsType(source.getSavingsType());
        target.setSavingsValue(source.getSavingsValue());
        target.setSpentAmount(BigDecimal.ZERO);
        return target;
    }
}
