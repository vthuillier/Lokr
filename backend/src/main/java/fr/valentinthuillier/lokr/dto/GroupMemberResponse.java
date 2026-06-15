package fr.valentinthuillier.lokr.dto;

import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import java.util.UUID;

public record GroupMemberResponse(
    UUID userId,
    String email,
    GroupRole role,
    String encryptedGroupKey,
    String publicKey
) {}
