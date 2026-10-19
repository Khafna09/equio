package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import com.equio.backend.shared.events.MovementWriteRequestedEvent;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class ClosedBudgetMovementGuard {
    private final BudgetRepository budgets;

    public ClosedBudgetMovementGuard(BudgetRepository budgets) {
        this.budgets = budgets;
    }

    @EventListener
    public void validate(MovementWriteRequestedEvent event) {
        boolean closed = budgets.findByUserIdAndStatus(event.userId(), BudgetStatus.CLOSED).stream()
                .anyMatch(budget -> budget.getStartDate() != null && budget.getEndDate() != null
                        && !event.date().isBefore(budget.movementStart())
                        && !event.date().isAfter(budget.movementEnd())
                        && (budget.getCategory() == null || budget.getCategory().getId().equals(event.categoryId())));
        if (closed) {
            throw new BusinessConflictException("MOVEMENT_CLOSED_PERIOD",
                    "Movements in a closed budget period cannot be changed.");
        }
    }
}
