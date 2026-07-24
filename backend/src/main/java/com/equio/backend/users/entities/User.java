package com.equio.backend.users.entities;

import com.equio.backend.shared.entities.AuditableModel;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Entidad JPA principal para los Usuarios del sistema.
 * Extiende de AuditableModel para poseer automáticamente las fechas de auditoría.
 */
@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends AuditableModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max=50)
    @Column(unique=true)
    private String email;

    @NotBlank
    @Size(max = 120)
    private String password;

    @ManyToMany(fetch = FetchType.EAGER, cascade = CascadeType.ALL)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles;

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = false)
    private Profile profile;

    public User() {
        this.roles = new HashSet<>();
    }

    public User(String email, String password) {
        this.email = email;
        this.password = password;
        this.roles = new HashSet<>();
    }

    public User(String email, String password, List<Role> roles) {
        this(email, password);
        addRoles(roles);
    }

    public User addRole(Role role) {
        this.roles.add(role);
        return this;
    }

    public User addRoles(List<Role> roles) {
        var validatedRoleSet = Role.validateRoleSet(roles);
        this.roles.addAll(validatedRoleSet);
        return this;
    }


}
