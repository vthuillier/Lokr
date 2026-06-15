package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateGroupRequest(
    @NotBlank String name,
    @NotBlank String encryptedGroupKey
) {}
