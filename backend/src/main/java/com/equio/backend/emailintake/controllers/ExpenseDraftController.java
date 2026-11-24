package com.equio.backend.emailintake.controllers;

import com.equio.backend.emailintake.domain.ExpenseDraft;
import com.equio.backend.emailintake.services.ExpenseDraftService;
import com.equio.backend.emailintake.services.PostalDeliveryQueue;
import com.equio.backend.users.services.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expense-drafts")
public class ExpenseDraftController {
    private final ExpenseDraftService drafts;
    private final UserService users;
    private final PostalDeliveryQueue deliveries;

    public ExpenseDraftController(ExpenseDraftService drafts, UserService users, PostalDeliveryQueue deliveries) {
        this.drafts = drafts;
        this.users = users;
        this.deliveries = deliveries;
    }

    @GetMapping
    public List<ExpenseDraft> list(@AuthenticationPrincipal UserDetails principal) {
        return drafts.listPending(userId(principal));
    }

    @GetMapping("/review-count")
    public ReviewCount reviewCount(@AuthenticationPrincipal UserDetails principal) {
        return new ReviewCount(deliveries.reviewCount(userId(principal)));
    }

    @PostMapping("/{id}/approve")
    public Approval approve(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id,
                            @Valid @RequestBody ApprovalRequest request) {
        return new Approval(drafts.approve(userId(principal), id, request.amount(), request.description(),
                request.date(), request.categoryId()));
    }

    @PostMapping("/{id}/discard")
    public ResponseEntity<Void> discard(@AuthenticationPrincipal UserDetails principal, @PathVariable UUID id) {
        drafts.discard(userId(principal), id);
        return ResponseEntity.noContent().build();
    }

    private long userId(UserDetails principal) {
        return users.requireAuthenticated(principal.getUsername()).getId();
    }

    public record Approval(long movementId) {}
    public record ReviewCount(long count) {}

    public record ApprovalRequest(@NotNull @Positive @Digits(integer = 10, fraction = 2) BigDecimal amount,
                                  @Size(max = 150) @Pattern(regexp = "^[^\\p{Cc}\\p{Cf}\\p{Cs}]*$") String description,
                                  @NotNull @PastOrPresent LocalDateTime date, @Positive Long categoryId) {}
}
