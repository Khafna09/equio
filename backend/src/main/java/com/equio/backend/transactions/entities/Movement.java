package com.equio.backend.transactions.entities;


import com.equio.backend.shared.entities.AuditableModel;
import com.equio.backend.transactions.entities.enums.MovementType;
import com.equio.backend.users.entities.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "movements")
public class Movement extends AuditableModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MovementType type;

    @Size(max = 150)
    @Column(nullable = true, length = 150)
    private String description;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = true)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public Movement(BigDecimal amount, MovementType type, String description, LocalDateTime date, Category category, User user) {
        this.amount = amount;
        this.type = type;
        this.description = description;
        this.date = date;
        this.category = category;
        this.user = user;
    }


}
