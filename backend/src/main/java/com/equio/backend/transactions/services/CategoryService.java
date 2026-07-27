package com.equio.backend.transactions.services;

import com.equio.backend.transactions.dto.requests.CategoryRequest;
import com.equio.backend.transactions.dto.responses.CategoryResponse;

import java.util.List;

public interface CategoryService {

    CategoryResponse createCategory(Long userId, CategoryRequest request);

    List<CategoryResponse> getAllByUserId(Long userId);

    CategoryResponse getById(Long userId, Long categoryId);

    CategoryResponse updateCategory(Long userId, Long categoryId, CategoryRequest request);

    void deleteCategory(Long userId, Long categoryId);
}
