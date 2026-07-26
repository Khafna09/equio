package com.equio.backend.users.services;

import com.equio.backend.users.entities.Role;
import com.equio.backend.users.entities.enums.Roles;

import java.util.List;
import java.util.Optional;

/**
 * Interfaz unificada para la lógica de negocio relacionada con los Roles.
 */
public interface RoleService {
    
    void seedRoles();
    
    List<Role> getAllRoles();
    
    Optional<Role> getRoleByName(Roles name);
}
