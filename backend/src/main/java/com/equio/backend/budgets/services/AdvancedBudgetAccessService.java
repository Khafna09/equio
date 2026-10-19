package com.equio.backend.budgets.services;

import com.equio.backend.budgets.dto.responses.BudgetCapabilitiesResponse;
import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.users.entities.enums.BudgetMode;
import com.equio.backend.users.services.ProfileBudgetModeService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdvancedBudgetAccessService {
    private final boolean enabled;
    private final ProfileBudgetModeService profileBudgetModeService;

    public AdvancedBudgetAccessService(
            @Value("${app.features.advanced-budgets-enabled:true}") boolean enabled,
            ProfileBudgetModeService profileBudgetModeService) {
        this.enabled = enabled;
        this.profileBudgetModeService = profileBudgetModeService;
    }

    public BudgetCapabilitiesResponse getCapabilities() {
        return new BudgetCapabilitiesResponse(enabled, enabled, enabled);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void requireEnabled() {
        if (!enabled) {
            throw new BusinessConflictException(
                    "BUDGET_ADVANCED_MODE_DISABLED",
                    "Advanced budget mode is not enabled.");
        }
    }

    public void requireEnabledForUser(Long userId) {
        requireEnabled();
        BudgetMode mode = profileBudgetModeService.getMode(userId);
        if (mode != BudgetMode.ADVANCED) {
            throw new BusinessConflictException(
                    "BUDGET_ADVANCED_MODE_REQUIRED",
                    "The user must enable advanced budget mode first.");
        }
    }
}
