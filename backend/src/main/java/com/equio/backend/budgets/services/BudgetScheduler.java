package com.equio.backend.budgets.services;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.equio.backend.budgets.repositories.BudgetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class BudgetScheduler {

    private static final Logger log = LoggerFactory.getLogger(BudgetScheduler.class);
    private final BudgetRepository budgetRepository;

    public BudgetScheduler(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    @Scheduled(cron = "0 0 0 * * ?") // Todos los días a medianoche
    @Transactional
    public void processExpiredBudgets() {
        log.info("Iniciando proceso de cierre y auto-renovación de presupuestos...");
        LocalDate today = LocalDate.now();

        // BR-5.1: Buscar todos los presupuestos activos (solo padres e independientes)
        List<Budget> activeBudgets = budgetRepository.findByStatus(BudgetStatus.ACTIVE)
                .stream()
                .filter(b -> b.getParentBudget() == null) // Evitamos procesar hijos directamente (se cierran en cascada)
                .toList();

        for (Budget budget : activeBudgets) {
            // BR-5.1: Cierre Natural
            if (budget.getEndDate() != null && budget.getEndDate().isBefore(today)) {
                log.info("Cerrando presupuesto ID: {}", budget.getId());
                closeBudgetTree(budget);
                budgetRepository.save(budget);

                // BR-5.5: Auto-renovación (solo si es Recurrente/isFixed)
                if (budget.isFixed()) {
                    renewBudgetTree(budget);
                }
            }
        }
        
        log.info("Proceso de presupuestos finalizado.");
    }

    private void closeBudgetTree(Budget budget) {
        budget.setStatus(BudgetStatus.CLOSED);
        if (budget.getSubBudgets() != null) {
            for (Budget child : budget.getSubBudgets()) {
                if (child.getStatus() == BudgetStatus.ACTIVE) {
                    child.setStatus(BudgetStatus.CLOSED);
                    // Como el padre llegó a su endDate natural, los hijos (herederos) también
                    budgetRepository.save(child);
                }
            }
        }
    }

    private void renewBudgetTree(Budget oldBudget) {
        log.info("Auto-renovando presupuesto recurrente ID: {}", oldBudget.getId());
        
        // Calcular nuevas fechas para el siguiente ciclo mensual completo
        LocalDate newStartDate = oldBudget.getNextStartDate() != null ? oldBudget.getNextStartDate() : oldBudget.getEndDate().plusDays(1);
        LocalDate newEndDate = newStartDate.plusMonths(1).minusDays(1);

        Budget newBudget = new Budget();
        newBudget.setName(oldBudget.getName());
        newBudget.setTotalAmount(oldBudget.getTotalAmount());
        newBudget.setFixed(true);
        newBudget.setStartDate(newStartDate);
        newBudget.setEndDate(newEndDate);
        newBudget.setCategory(oldBudget.getCategory());
        newBudget.setUser(oldBudget.getUser());
        newBudget.setStatus(BudgetStatus.ACTIVE);
        newBudget.setSavingsType(oldBudget.getSavingsType());
        newBudget.setSavingsValue(oldBudget.getSavingsValue());
        newBudget.setSpentAmount(BigDecimal.ZERO);

        Budget savedNewBudget = budgetRepository.save(newBudget);

        if (oldBudget.getSubBudgets() != null) {
            for (Budget oldChild : oldBudget.getSubBudgets()) {
                Budget newChild = new Budget();
                newChild.setName(oldChild.getName());
                newChild.setTotalAmount(oldChild.getTotalAmount());
                newChild.setFixed(true);
                newChild.setStartDate(newStartDate);
                newChild.setEndDate(newEndDate);
                newChild.setCategory(oldChild.getCategory());
                newChild.setUser(oldChild.getUser());
                newChild.setStatus(BudgetStatus.ACTIVE);
                newChild.setSavingsType(oldChild.getSavingsType());
                newChild.setSavingsValue(oldChild.getSavingsValue());
                newChild.setSpentAmount(BigDecimal.ZERO);
                newChild.setParentBudget(savedNewBudget);
                
                budgetRepository.save(newChild);
            }
        }
    }
}
