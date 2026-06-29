package fr.valentinthuillier.lokr.controllers;

import fr.valentinthuillier.lokr.dto.MeResponse;
import fr.valentinthuillier.lokr.dto.PublicKeyResponse;
import fr.valentinthuillier.lokr.dto.TotpSetupResponse;
import fr.valentinthuillier.lokr.dto.TotpVerifyRequest;
import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.repositories.UserRepository;
import fr.valentinthuillier.lokr.services.TotpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Contrôleur gérant les requêtes relatives à l'utilisateur actuellement connecté.
 * Permet notamment la gestion du profil, de la double authentification (TOTP) et de la récupération des clés publiques.
 */
@RestController
@RequiredArgsConstructor
public class UserController {

    /** Référentiel de gestion des utilisateurs. */
    private final UserRepository userRepository;

    /** Service gérant la double authentification TOTP. */
    private final TotpService totpService;

    /**
     * Endpoint pour récupérer les informations de l'utilisateur authentifié actuel.
     *
     * @param user L'utilisateur actuellement connecté
     * @return Les informations de l'utilisateur courant (id, email, statut 2FA)
     */
    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        User freshUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
        return new MeResponse(
                freshUser.getId(),
                freshUser.getEmail(),
                freshUser.isTotpEnabled());
    }

    /**
     * Endpoint pour démarrer la configuration de la double authentification (2FA / TOTP).
     * Génère un secret temporaire et l'URI correspondante pour un QR code.
     *
     * @param user L'utilisateur actuellement connecté
     * @return Le secret généré et l'URI du QR Code
     */
    @PostMapping("/api/user/totp/setup")
    public TotpSetupResponse setupTotp(@AuthenticationPrincipal User user) {
        User dbUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));

        if (dbUser.isTotpEnabled()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Double authentification déjà activée");
        }

        String secret = totpService.generateSecret();
        String qrUri = totpService.getQrCodeUri(secret, dbUser.getEmail());

        dbUser.setTotpSecret(secret);
        dbUser.setTotpEnabled(false);
        userRepository.save(dbUser);

        return new TotpSetupResponse(secret, qrUri);
    }

    /**
     * Endpoint pour finaliser et activer la double authentification en vérifiant un premier code.
     *
     * @param user L'utilisateur actuellement connecté
     * @param request La requête contenant le code de validation TOTP à vérifier
     */
    @PostMapping("/api/user/totp/enable")
    public void enableTotp(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TotpVerifyRequest request
    ) {
        User dbUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));

        if (dbUser.getTotpSecret() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Configuration TOTP non initialisée");
        }

        boolean isValid = totpService.verifyCode(dbUser.getTotpSecret(), request.code());
        if (!isValid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code de validation incorrect");
        }

        dbUser.setTotpEnabled(true);
        userRepository.save(dbUser);
    }

    /**
     * Endpoint pour désactiver la double authentification (2FA / TOTP).
     *
     * @param user L'utilisateur actuellement connecté
     * @param request La requête contenant le code de validation TOTP à vérifier avant désactivation
     */
    @PostMapping("/api/user/totp/disable")
    public void disableTotp(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody TotpVerifyRequest request
    ) {
        User dbUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));

        if (!dbUser.isTotpEnabled()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Double authentification non activée");
        }

        boolean isValid = totpService.verifyCode(dbUser.getTotpSecret(), request.code());
        if (!isValid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code de validation incorrect");
        }

        dbUser.setTotpEnabled(false);
        dbUser.setTotpSecret(null);
        userRepository.save(dbUser);
    }

    /**
     * Endpoint pour récupérer la clé publique de chiffrement d'un utilisateur par son adresse email.
     *
     * @param email L'adresse email de l'utilisateur recherché
     * @return La clé publique de l'utilisateur
     */
    @GetMapping("/api/users/{email}/public-key")
    public PublicKeyResponse getPublicKeyByEmail(@PathVariable String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
        if (user.getPublicKey() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cet utilisateur n'a pas configuré de clé publique");
        }
        return new PublicKeyResponse(user.getPublicKey());
    }

}
