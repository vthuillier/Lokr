package fr.valentinthuillier.lokr.dto;

import jakarta.validation.constraints.NotBlank;

public record TotpVerifyRequest(
        @NotBlank
        String code
) {
}
