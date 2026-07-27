package com.equio.backend.transactions.repositories;


import com.equio.backend.transactions.entities.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    boolean existsByNameAndUserId(String name, Long userId);
    boolean existsByNameIgnoreCaseAndUserId(String name, Long userId);
    List<Category> findByUserId(Long userId);
    Optional<Category> findByIdAndUserId(Long id, Long userId);

}
