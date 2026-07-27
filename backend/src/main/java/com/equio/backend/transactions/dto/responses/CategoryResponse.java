package com.equio.backend.transactions.dto.responses;

public record CategoryResponse (
        Long id,
        String name,
        String color,
        String icon
){
}
