package com.equio.backend.users.services;

import com.equio.backend.users.entities.Role;
import com.equio.backend.users.entities.enums.Roles;
import com.equio.backend.users.repositories.RoleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    public RoleServiceImpl(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public void seedRoles() {
        if (!roleRepository.existsByName(Roles.ROLE_USER)) {
            roleRepository.save(new Role(Roles.ROLE_USER));
        }
        if (!roleRepository.existsByName(Roles.ROLE_ADMIN)) {
            roleRepository.save(new Role(Roles.ROLE_ADMIN));
        }
    }

    @Override
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    @Override
    public java.util.Optional<Role> getRoleByName(Roles name) {
        return roleRepository.findByName(name);
    }
}
