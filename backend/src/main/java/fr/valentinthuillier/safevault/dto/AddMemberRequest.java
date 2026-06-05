package fr.valentinthuillier.safevault.dto;

import fr.valentinthuillier.safevault.models.GroupAccess.GroupRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AddMemberRequest(
    @NotBlank @Email String email,
    @NotBlank String encryptedGroupKey,
    @NotNull GroupRole role
) {}
