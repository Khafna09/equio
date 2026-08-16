package com.equio.backend.transactions.services;

import com.equio.backend.transactions.dto.requests.CreateMovementRequest;
import com.equio.backend.transactions.dto.responses.MovementResponse;

import java.util.List;

public interface CreateMovementService {

    MovementResponse createMovement(Long userId, CreateMovementRequest createMovementRequest);
    MovementResponse updateMovement(Long userId, Long movementId, CreateMovementRequest createMovementRequest);
    void deleteMovement(Long userId, Long movementId);
    
    MovementResponse getById(Long userId, Long movementId);
    
    List<MovementResponse> getAllByFilters(Long userId, String type, Long categoryId, java.time.LocalDate startDate, java.time.LocalDate endDate);

}
