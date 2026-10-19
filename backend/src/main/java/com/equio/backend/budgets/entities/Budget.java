package com.equio.backend.budgets.entities;

import com.equio.backend.shared.entities.AuditableModel;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.users.entities.User;
import com.equio.backend.budgets.entities.enums.SavingsType;
import com.equio.backend.budgets.entities.enums.BudgetStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Representa un presupuesto mensual o continuo que el usuario establece para controlar sus gastos.
 * Puede ser global (sin categoría) o específico de una categoría.
 * El campo spentAmount se incrementa automáticamente cuando se registra un movimiento de tipo EXPENSE.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "budgets")
public class Budget extends AuditableModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private long version;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal spentAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal savingsPoolContribution = BigDecimal.ZERO;


    @Column(nullable = false)
    private boolean isFixed = false;


    @Column(nullable = true)
    private LocalDate startDate;

    @Column(nullable = true)
    private LocalDate endDate;

    @Column(nullable = true)
    private LocalDate nextStartDate;

    private LocalDateTime accountingStartAt;

    private LocalDateTime closedAt;

    public LocalDateTime movementStart() {
        return accountingStartAt != null ? accountingStartAt : startDate.atStartOfDay();
    }

    public LocalDateTime movementEnd() {
        return closedAt != null ? closedAt : endDate.atTime(LocalTime.of(23, 59, 59, 999_999_000));
    }


    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private SavingsType savingsType;


    @Column(nullable = true, precision = 12, scale = 2)
    private BigDecimal savingsValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = true)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BudgetStatus status = BudgetStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_budget_id")
    @JsonIgnore
    private Budget parentBudget;

    @OneToMany(mappedBy = "parentBudget", fetch = FetchType.LAZY)
    private List<Budget> subBudgets = new ArrayList<>();
}
