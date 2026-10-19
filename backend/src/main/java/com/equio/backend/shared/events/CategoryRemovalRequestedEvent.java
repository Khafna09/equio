package com.equio.backend.shared.events;

public record CategoryRemovalRequestedEvent(Long userId, Long categoryId) {}
