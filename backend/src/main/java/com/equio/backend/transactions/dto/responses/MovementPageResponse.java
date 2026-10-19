package com.equio.backend.transactions.dto.responses;

import java.time.LocalDateTime;
import java.util.List;

public record MovementPageResponse(List<MovementResponse> items, Cursor nextCursor) {
    public record Cursor(LocalDateTime beforeDate, Long beforeId) {}
}
