package com.equio.backend.shared.entities;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.Date;

/**
 * Entidad base para proveer campos de auditoría automáticos a todas las entidades.
 * Hereda de esta clase para tener createdAt y updatedAt gestionados por Spring Data JPA.
 */
@EntityListeners(AuditingEntityListener.class)
@MappedSuperclass
public class AuditableModel {

    @Getter
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    @Getter
    @LastModifiedDate
    @Column(nullable = false)
    private Date updatedAt;
}
