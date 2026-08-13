package com.equio.backend.transactions.services;

import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.transactions.dto.requests.CategoryRequest;
import com.equio.backend.transactions.dto.responses.CategoryResponse;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.repositories.CategoryRepository;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final RlsContext rlsContext;

    public CategoryServiceImpl(
            CategoryRepository categoryRepository,
            UserRepository userRepository,
            RlsContext rlsContext
    ) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.rlsContext = rlsContext;
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(Long userId, CategoryRequest request) {
        rlsContext.setUserId(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        String trimmedName = request.name() != null ? request.name().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("El nombre de la categoría no puede estar vacío.");
        }

        if (categoryRepository.existsByNameIgnoreCaseAndUserId(trimmedName, userId)) {
            throw new IllegalArgumentException("Ya existe una categoría con el nombre: " + trimmedName);
        }

        String color = (request.color() != null && !request.color().isBlank()) ? request.color().trim() : "#6366F1";
        String icon = (request.icon() != null && !request.icon().isBlank()) ? request.icon().trim() : "📁";

        Category category = new Category();
        category.setName(trimmedName);
        category.setColor(color);
        category.setIcon(icon);
        category.setUser(user);

        Category savedCategory = categoryRepository.save(category);
        return toResponse(savedCategory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllByUserId(Long userId) {
        rlsContext.setUserId(userId);
        return categoryRepository.findByUserId(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse getById(Long userId, Long categoryId) {
        rlsContext.setUserId(userId);
        Category category = findCategoryAndValidateOwner(userId, categoryId);
        return toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(Long userId, Long categoryId, CategoryRequest request) {
        rlsContext.setUserId(userId);
        Category category = findCategoryAndValidateOwner(userId, categoryId);

        String trimmedName = request.name() != null ? request.name().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("El nombre de la categoría no puede estar vacío.");
        }

        if (!category.getName().equalsIgnoreCase(trimmedName) 
                && categoryRepository.existsByNameIgnoreCaseAndUserId(trimmedName, userId)) {
            throw new IllegalArgumentException("Ya existe una categoría con el nombre: " + trimmedName);
        }

        String color = (request.color() != null && !request.color().isBlank()) ? request.color().trim() : "#6366F1";
        String icon = (request.icon() != null && !request.icon().isBlank()) ? request.icon().trim() : "📁";

        category.setName(trimmedName);
        category.setColor(color);
        category.setIcon(icon);

        Category updatedCategory = categoryRepository.save(category);
        return toResponse(updatedCategory);
    }

    @Override
    @Transactional
    public void deleteCategory(Long userId, Long categoryId) {
        rlsContext.setUserId(userId);
        Category category = findCategoryAndValidateOwner(userId, categoryId);
        categoryRepository.delete(category);
    }


    private Category findCategoryAndValidateOwner(Long userId, Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category"));
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getColor(),
                category.getIcon()
        );
    }
}
