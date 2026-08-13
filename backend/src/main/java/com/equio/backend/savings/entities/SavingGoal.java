package com.equio.backend.savings.entities;

import com.equio.backend.budgets.entities.Budget;
import com.equio.backend.shared.entities.AuditableModel;
import com.equio.backend.users.entities.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Representa una meta de ahorro específica del usuario (ej: "Viaje a Europa", "Fondo de Emergencia").
 * Puede estar vinculada a un Budget. Si el Budget se elimina, esta meta se elimina en cascada.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "saving_goals")
public class SavingGoal extends AuditableModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private long version;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal targetAmount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal currentAmount = BigDecimal.ZERO;

    @Column(nullable = true)
    private LocalDate deadline;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "budget_id", nullable = true)
    private Budget budget;

    @Column(nullable = true, length = 50)
    private String tag;

    @Column(nullable = true, length = 500)
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
