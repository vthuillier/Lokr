package fr.valentinthuillier.safevault.dto;

import jakarta.validation.constraints.NotBlank;

public record TotpVerifyRequest(
        @NotBlank
        String code
) {
}
