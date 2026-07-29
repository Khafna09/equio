package com.equio.backend.savings.services;

import com.equio.backend.savings.dto.requests.FundRequest;
import com.equio.backend.savings.dto.requests.SavingGoalRequest;
import com.equio.backend.savings.dto.responses.SavingGoalResponse;

import java.util.List;

public interface SavingGoalService {

    SavingGoalResponse create(Long userId, SavingGoalRequest request);

    List<SavingGoalResponse> getAllByUser(Long userId);

    SavingGoalResponse getById(Long userId, Long goalId);

    SavingGoalResponse update(Long userId, Long goalId, SavingGoalRequest request);

    /**
     * Aporta ("ADD") o retira ("WITHDRAW") fondos de una meta de ahorro.
     * Valida que al retirar no se exceda el currentAmount.
     * Valida que al aportar no se supere el targetAmount.
     */
    SavingGoalResponse addOrWithdrawFund(Long userId, Long goalId, FundRequest request);

    void delete(Long userId, Long goalId);
}
