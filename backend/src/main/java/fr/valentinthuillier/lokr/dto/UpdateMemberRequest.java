package fr.valentinthuillier.lokr.dto;

import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import jakarta.validation.constraints.NotNull;

public record UpdateMemberRequest(
    @NotNull GroupRole role
) {}
