package fr.valentinthuillier.lokr.services;

import dev.samstevens.totp.code.*;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import org.springframework.stereotype.Service;

/**
 * Service de gestion de la double authentification par mot de passe unique à durée limitée (TOTP).
 * Permet de générer des secrets, des URI de QR codes pour les applications d'authentification (Google Authenticator, etc.)
 * et de vérifier la validité des codes saisis par l'utilisateur.
 */
@Service
public class TotpService {

    /** Générateur de secrets cryptographiques pour le TOTP. */
    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();

    /** Fournisseur de temps système nécessaire pour la validation des codes basés sur le temps. */
    private final TimeProvider timeProvider = new SystemTimeProvider();

    /** Générateur interne de codes TOTP. */
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();

    /** Vérificateur de codes TOTP configuré avec le générateur et le fournisseur de temps. */
    private final CodeVerifier codeVerifier = new DefaultCodeVerifier(codeGenerator, timeProvider);

    /**
     * Génère un nouveau secret de double authentification sécurisé sous forme de chaîne de caractères.
     *
     * @return Le secret généré
     */
    public String generateSecret() {
        return secretGenerator.generate();
    }

    /**
     * Construit l'URI standardisée du QR Code à scanner pour enregistrer la clé TOTP dans une application d'authentification.
     *
     * @param secret Le secret TOTP de l'utilisateur
     * @param email L'adresse email de l'utilisateur (utilisée comme libellé)
     * @return L'URI d'enregistrement TOTP
     */
    public String getQrCodeUri(String secret, String email) {
        QrData data = new QrData.Builder()
                .label(email)
                .secret(secret)
                .issuer("SafeVault")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
        return data.getUri();
    }

    /**
     * Vérifie la validité d'un code TOTP fourni par l'utilisateur par rapport à son secret.
     *
     * @param secret Le secret TOTP de l'utilisateur
     * @param code Le code à 6 chiffres soumis par l'utilisateur
     * @return true si le code est valide pour l'instant actuel, false sinon
     */
    public boolean verifyCode(String secret, String code) {
        if (code == null || code.trim().isEmpty() || secret == null) {
            return false;
        }
        return codeVerifier.isValidCode(secret, code);
    }
}
