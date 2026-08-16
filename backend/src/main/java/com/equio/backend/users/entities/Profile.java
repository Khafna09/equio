package com.equio.backend.users.entities;

import com.equio.backend.shared.entities.AuditableModel;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

@Getter
@Setter
@Entity
@Table(name = "profiles")
public class Profile extends AuditableModel{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max=50)
    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @NotBlank
    @Size(max=50)
    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @Column(name="language", length = 10)
    private String language = "es";

    @Column(name="currency", length = 10)
    private String currency = "PEN";

    @Column(name="theme", length = 20)
    private String theme = "light";

    @Column(name="time_format", nullable = false, length = 2)
    private String timeFormat = "24";

    public String getLanguage() {
        return language != null ? language : "es";
    }

    public String getCurrency() {
        return currency != null ? currency : "PEN";
    }

    public String getTheme() {
        return theme != null ? theme : "light";
    }

    public String getTimeFormat() {
        return timeFormat != null ? timeFormat : "24";
    }

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
}