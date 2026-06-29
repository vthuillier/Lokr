package fr.valentinthuillier.lokr.controllers;

import fr.valentinthuillier.lokr.dto.AuthResponse;
import fr.valentinthuillier.lokr.dto.LoginRequest;
import fr.valentinthuillier.lokr.dto.RegisterRequest;
import fr.valentinthuillier.lokr.services.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Contrôleur gérant les endpoints d'authentification et d'enregistrement des utilisateurs.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    /** Service gérant la logique d'authentification. */
    private final AuthService authService;

    /**
     * Endpoint permettant l'enregistrement (inscription) d'un nouvel utilisateur.
     *
     * @param request Les informations nécessaires pour l'inscription de l'utilisateur
     * @return La réponse contenant le jeton d'authentification et les détails de l'utilisateur
     */
    @PostMapping("/register")
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request
            ) {
        return authService.register(request);
    }

    /**
     * Endpoint permettant la connexion (authentification) d'un utilisateur existant.
     *
     * @param request Les informations d'identification de l'utilisateur (email et hash de mot de passe)
     * @return La réponse contenant le jeton d'authentification ou les étapes suivantes (2FA)
     */
    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request
    ) {
        return authService.login(request);
    }

}
