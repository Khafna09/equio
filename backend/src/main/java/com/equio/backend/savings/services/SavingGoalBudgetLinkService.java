package com.equio.backend.savings.services;

import com.equio.backend.savings.repositories.SavingGoalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavingGoalBudgetLinkService {

    private final SavingGoalRepository savingGoalRepository;

    public SavingGoalBudgetLinkService(SavingGoalRepository savingGoalRepository) {
        this.savingGoalRepository = savingGoalRepository;
    }

    @Transactional
    public void removeBudgetLink(Long budgetId, boolean preserveGoals) {
        var goals = savingGoalRepository.findByBudgetId(budgetId);
        if (preserveGoals) {
            goals.forEach(goal -> goal.setBudget(null));
            savingGoalRepository.saveAll(goals);
            return;
        }
        savingGoalRepository.deleteAll(goals);
    }
}
