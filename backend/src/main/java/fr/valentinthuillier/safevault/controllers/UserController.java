package fr.valentinthuillier.safevault.controllers;

import fr.valentinthuillier.safevault.dto.MeResponse;
import fr.valentinthuillier.safevault.dto.PublicKeyResponse;
import fr.valentinthuillier.safevault.dto.TotpSetupResponse;
import fr.valentinthuillier.safevault.dto.TotpVerifyRequest;
import fr.valentinthuillier.safevault.models.User;
import fr.valentinthuillier.safevault.repositories.UserRepository;
import fr.valentinthuillier.safevault.services.TotpService;
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

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final TotpService totpService;

    @GetMapping("/api/me")
    public MeResponse me(@AuthenticationPrincipal User user) {
        User freshUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
        return new MeResponse(
                freshUser.getId(),
                freshUser.getEmail(),
                freshUser.isTotpEnabled());
    }

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
