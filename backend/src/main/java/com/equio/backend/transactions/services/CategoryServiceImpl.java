package com.equio.backend.transactions.services;

import com.equio.backend.shared.exceptions.BusinessConflictException;
import com.equio.backend.shared.exceptions.ResourceNotFoundException;
import com.equio.backend.shared.security.RlsContext;
import com.equio.backend.shared.security.FinancialConcurrencyGuard;
import com.equio.backend.shared.events.CategoryRemovalRequestedEvent;
import com.equio.backend.transactions.repositories.MovementRepository;
import org.springframework.context.ApplicationEventPublisher;
import com.equio.backend.transactions.dto.requests.CategoryRequest;
import com.equio.backend.transactions.dto.responses.CategoryResponse;
import com.equio.backend.transactions.entities.Category;
import com.equio.backend.transactions.repositories.CategoryRepository;
import com.equio.backend.users.entities.User;
import com.equio.backend.users.services.UserLookupService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserLookupService userLookupService;
    private final RlsContext rlsContext;
    private final FinancialConcurrencyGuard guard;
    private final MovementRepository movements;
    private final ApplicationEventPublisher events;

    public CategoryServiceImpl(
            CategoryRepository categoryRepository,
            UserLookupService userLookupService,
            RlsContext rlsContext,
            FinancialConcurrencyGuard guard,
            MovementRepository movements,
            ApplicationEventPublisher events
    ) {
        this.categoryRepository = categoryRepository;
        this.userLookupService = userLookupService;
        this.rlsContext = rlsContext;
        this.guard = guard;
        this.movements = movements;
        this.events = events;
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(Long userId, CategoryRequest request) {
        guard.lock(userId);
        rlsContext.setUserId(userId);
        User user = userLookupService.requireUser(userId);

        String trimmedName = request.name() != null ? request.name().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("El nombre de la categoría no puede estar vacío.");
        }

        if (categoryRepository.existsByNameIgnoreCaseAndUserId(trimmedName, userId)) {
            throw new BusinessConflictException(
                    "Ya existe una categoría con el nombre: " + trimmedName);
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
        guard.lock(userId);
        rlsContext.setUserId(userId);
        Category category = findCategoryAndValidateOwner(userId, categoryId);

        String trimmedName = request.name() != null ? request.name().trim() : "";
        if (trimmedName.isEmpty()) {
            throw new IllegalArgumentException("El nombre de la categoría no puede estar vacío.");
        }

        if (!category.getName().equalsIgnoreCase(trimmedName) 
                && categoryRepository.existsByNameIgnoreCaseAndUserId(trimmedName, userId)) {
            throw new BusinessConflictException(
                    "Ya existe una categoría con el nombre: " + trimmedName);
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
        guard.lock(userId);
        rlsContext.setUserId(userId);
        Category category = findCategoryAndValidateOwner(userId, categoryId);
        if (movements.existsByUserIdAndCategoryId(userId, categoryId)) {
            throw new BusinessConflictException("CATEGORY_IN_USE", "A referenced category cannot be deleted.");
        }
        events.publishEvent(new CategoryRemovalRequestedEvent(userId, categoryId));
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
