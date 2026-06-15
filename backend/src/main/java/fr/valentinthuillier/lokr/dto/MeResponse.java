package fr.valentinthuillier.lokr.dto;

import java.util.UUID;

public record MeResponse(
        UUID id,
        String email,
        boolean totpEnabled
) {}
