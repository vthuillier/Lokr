package fr.valentinthuillier.safevault.controllers;

import fr.valentinthuillier.safevault.dto.MeResponse;
import fr.valentinthuillier.safevault.models.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        return new MeResponse(
                user.getId(),
                user.getEmail(),
                user.isTotpEnabled());
    }

}
