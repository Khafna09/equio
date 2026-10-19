package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.jobs.DatabaseJobLock;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.shared.security.RlsContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class BudgetCycleProcessor {
    private static final Logger LOGGER = LoggerFactory.getLogger(BudgetCycleProcessor.class);
    private static final int MAX_CYCLES_PER_RUN = 24;
    private final BudgetRepository budgets;
    private final BudgetSettlementService settlements;
    private final RlsContext rls;
    private final DatabaseJobLock jobLock;
    private final FinancialConcurrencyGuard guard;

    public BudgetCycleProcessor(BudgetRepository budgets, BudgetSettlementService settlements,
                                RlsContext rls, DatabaseJobLock jobLock, FinancialConcurrencyGuard guard) {
        this.budgets = budgets;
        this.settlements = settlements;
        this.rls = rls;
        this.jobLock = jobLock;
        this.guard = guard;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processUser(Long userId, LocalDate today) {
        if (!jobLock.tryAcquire(8_000_000_000L + userId)) return;
        guard.lock(userId);
        rls.setUserId(userId);
        for (int cycle = 0; cycle < MAX_CYCLES_PER_RUN; cycle++) {
            List<Budget> expired = budgets.findByUserIdAndStatus(userId, BudgetStatus.ACTIVE).stream()
                    .filter(b -> b.getParentBudget() == null && b.getEndDate() != null && b.getEndDate().isBefore(today))
                    .toList();
            if (expired.isEmpty()) return;
            for (Budget budget : expired) {
                var children = budget.getSubBudgets().stream()
                        .filter(child -> child.getStatus() == BudgetStatus.ACTIVE).toList();
                close(budget);
                children.forEach(this::close);
                budgets.saveAll(children);
                budgets.saveAndFlush(budget);
                settlements.publishSettlement(budget, budget.getEndDate());
                if (budget.isFixed()) {
                    LocalDate start = budget.getEndDate().plusDays(1);
                    if (budget.getNextStartDate() != null && budget.getNextStartDate().isAfter(start)) {
                        start = budget.getNextStartDate();
                    }
                    Budget renewed = budgets.save(copy(budget, start));
                    for (Budget child : children) {
                        Budget renewedChild = copy(child, start);
                        renewedChild.setParentBudget(renewed);
                        budgets.save(renewedChild);
                    }
                }
                LOGGER.info("budget_cycle_completed userId={} budgetId={}", userId, budget.getId());
            }
            budgets.flush();
        }
        LOGGER.warn("budget_cycle_catchup_pending userId={} limit={}", userId, MAX_CYCLES_PER_RUN);
    }

    private void close(Budget budget) {
        budget.setStatus(BudgetStatus.CLOSED);
        budget.setClosedAt(budget.getEndDate().atTime(LocalTime.of(23, 59, 59, 999_999_000)));
    }

    private Budget copy(Budget source, LocalDate start) {
        Budget target = new Budget();
        target.setName(source.getName());
        target.setTotalAmount(source.getTotalAmount().subtract(source.getSavingsPoolContribution()));
        target.setSavingsPoolContribution(BigDecimal.ZERO);
        target.setFixed(true);
        target.setStartDate(start);
        target.setAccountingStartAt(start.atStartOfDay());
        target.setEndDate(start.plusMonths(1).minusDays(1));
        target.setCategory(source.getCategory());
        target.setUser(source.getUser());
        target.setSavingsType(source.getSavingsType());
        target.setSavingsValue(source.getSavingsValue());
        return target;
    }
}
