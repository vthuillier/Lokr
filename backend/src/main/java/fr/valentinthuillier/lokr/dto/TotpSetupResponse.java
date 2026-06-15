package fr.valentinthuillier.lokr.dto;

public record TotpSetupResponse(
        String secret,
        String otpauthUri
) {
}
