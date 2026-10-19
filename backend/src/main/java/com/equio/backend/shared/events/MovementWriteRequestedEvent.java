package com.equio.backend.shared.events;

import java.time.LocalDateTime;

public record MovementWriteRequestedEvent(Long userId, LocalDateTime date, Long categoryId) {}
