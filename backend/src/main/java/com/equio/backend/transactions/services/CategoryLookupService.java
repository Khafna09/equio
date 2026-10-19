package com.equio.backend.transactions.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.repositories.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryLookupService {

    private final CategoryRepository categoryRepository;

    public CategoryLookupService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public Category requireOwnedCategory(Long userId, Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category"));
    }

    @Transactional(readOnly = true)
    public List<CategorySnapshot> findByUser(Long userId) {
        return categoryRepository.findByUserId(userId).stream()
                .map(category -> new CategorySnapshot(
                        category.getId(), category.getName(), category.getColor(), category.getIcon()))
                .toList();
    }

    public record CategorySnapshot(Long id, String name, String color, String icon) {
    }
}
