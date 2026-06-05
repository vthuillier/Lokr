package fr.valentinthuillier.safevault.dto;

import fr.valentinthuillier.safevault.models.GroupAccess.GroupRole;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRequest(
    @NotNull GroupRole role
) {}
