package fr.valentinthuillier.safevault.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateGroupRequest(
    @NotBlank String name,
    @NotBlank String encryptedGroupKey
) {}
