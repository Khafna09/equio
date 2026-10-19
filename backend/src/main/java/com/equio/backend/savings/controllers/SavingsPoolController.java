package com.equio.backend.savings.controllers;

import com.equio.backend.savings.dto.requests.SavingsPoolBudgetTransferRequest;
import com.equio.backend.savings.dto.requests.SavingsPoolGoalTransferRequest;
import com.equio.backend.savings.dto.responses.SavingsPoolResponse;
import com.equio.backend.savings.services.SavingsPoolService;
import com.equio.backend.users.services.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/savings/pool")
@Tag(name = "Savings pool", description = "Internal savings accumulated from closed budgets")
@SecurityRequirement(name = "Bearer Authentication")
public class SavingsPoolController {
    private final SavingsPoolService savingsPoolService;
    private final UserService userService;

    public SavingsPoolController(SavingsPoolService savingsPoolService, UserService userService) {
        this.savingsPoolService = savingsPoolService;
        this.userService = userService;
    }

    @GetMapping
    @Operation(summary = "Get the authenticated user's savings pool")
    public ResponseEntity<SavingsPoolResponse> get(@AuthenticationPrincipal UserDetails principal) {
        var user = userService.requireAuthenticated(principal.getUsername());
        return ResponseEntity.ok(savingsPoolService.get(user.getId()));
    }

    @PostMapping("/transfer-to-goal")
    @Operation(summary = "Transfer savings pool funds to an owned saving goal")
    public ResponseEntity<SavingsPoolResponse> transferToGoal(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody SavingsPoolGoalTransferRequest request) {
        var user = userService.requireAuthenticated(principal.getUsername());
        return ResponseEntity.ok(savingsPoolService.transferToGoal(
                user.getId(), request.goalId(), request.amount()));
    }

    @PostMapping("/transfer-to-budget")
    @Operation(summary = "Transfer savings pool funds to an active global budget")
    public ResponseEntity<SavingsPoolResponse> transferToBudget(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody SavingsPoolBudgetTransferRequest request) {
        var user = userService.requireAuthenticated(principal.getUsername());
        return ResponseEntity.ok(savingsPoolService.transferToBudget(
                user.getId(), request.budgetId(), request.amount()));
    }
}
