package com.equio.backend.transactions.entities;


import com.equio.backend.shared.entities.AuditableModel;
import com.equio.backend.users.entities.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "categories")
public class Category extends AuditableModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    private String name;

    @NotBlank
    @Size(max = 30)
    @Column(length = 30, nullable = false)
    private String color; // Ej: "#FF5733"

    @NotBlank
    @Size(max = 50)
    @Column(length = 50, nullable = false)
    private String icon; // Ej: emoji "🍔" o nombre de ícono

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Constructor de conveniencia sin ID (el ID lo genera la BD)
    public Category(String name, String color, String icon, User user) {
        this.name = name;
        this.color = color;
        this.icon = icon;
        this.user = user;
    }
}


