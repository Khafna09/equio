package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.shared.events.BudgetSavingsSettlementEvent;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.transactions.services.MovementQueryService;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Service
public class BudgetSettlementService {
    private final MovementQueryService movementQueryService;
    private final ApplicationEventPublisher eventPublisher;

    public BudgetSettlementService(MovementQueryService movementQueryService,
                                   ApplicationEventPublisher eventPublisher) {
        this.movementQueryService = movementQueryService;
        this.eventPublisher = eventPublisher;
    }

    public BigDecimal publishSettlement(Budget budget, LocalDate closingDate) {
        if (budget.getParentBudget() != null || budget.getCategory() != null
                || budget.getStartDate() == null || closingDate == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal assignable = BudgetPolicy.assignableLimit(
                budget.getTotalAmount(), budget.getSavingsType(), budget.getSavingsValue(),
                budget.getSavingsPoolContribution());
        BigDecimal reserved = budget.getTotalAmount().subtract(assignable).max(BigDecimal.ZERO);
        BigDecimal spent = movementQueryService.sumByType(
                budget.getUser().getId(), MovementType.EXPENSE,
                budget.movementStart(), budget.getClosedAt() != null
                        ? budget.getClosedAt() : closingDate.atTime(LocalTime.of(23, 59, 59, 999_999_000)));
        BigDecimal unused = assignable.subtract(spent).max(BigDecimal.ZERO);
        BudgetSavingsSettlementEvent event = new BudgetSavingsSettlementEvent(
                budget.getUser().getId(), budget.getId(), reserved, unused);
        if (event.totalAmount().signum() > 0) {
            eventPublisher.publishEvent(event);
        }
        return event.totalAmount();
    }
}
