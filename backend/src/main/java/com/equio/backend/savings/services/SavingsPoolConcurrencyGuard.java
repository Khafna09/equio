package com.equio.backend.savings.services;

import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class SavingsPoolConcurrencyGuard {
    private final FinancialConcurrencyGuard financialGuard;

    public SavingsPoolConcurrencyGuard(FinancialConcurrencyGuard financialGuard) {
        this.financialGuard = financialGuard;
    }

    public void lock(Long userId) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Savings pool locks require an active transaction");
        }
        financialGuard.lock(userId);
    }
}
