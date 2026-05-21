package fr.valentinthuillier.safevault.dto;

public record TotpSetupResponse(
        String secret,
        String otpauthUri
) {
}
