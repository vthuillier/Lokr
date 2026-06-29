package fr.valentinthuillier.lokr.services;

import fr.valentinthuillier.lokr.dto.AuthResponse;
import fr.valentinthuillier.lokr.dto.LoginRequest;
import fr.valentinthuillier.lokr.dto.RegisterRequest;
import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Service gérant les processus d'enregistrement et d'authentification des utilisateurs (MFA inclus).
 */
@Service
@RequiredArgsConstructor
public class AuthService {

        /** Référentiel de gestion des utilisateurs. */
        private final UserRepository userRepository;

        /** Composant d'encodage des mots de passe. */
        private final PasswordEncoder passwordEncoder;

        /** Service de génération et gestion des jetons JWT. */
        private final JwtService jwtService;

        /** Service de gestion de la double authentification TOTP. */
        private final TotpService totpService;

        /**
         * Enregistre un nouvel utilisateur dans le système et génère son premier jeton JWT.
         *
         * @param registerRequest Les données nécessaires à la création du compte (email, mot de passe, sels et clés cryptographiques)
         * @return La réponse d'authentification contenant le jeton et les détails de l'utilisateur
         * @throws ResponseStatusException Si l'adresse email est déjà enregistrée (409 Conflict)
         */
        public AuthResponse register(RegisterRequest registerRequest) {

                if (userRepository.existsByEmail(registerRequest.email())) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "L'adresse email existe déjà");
                }

                User user = User.builder()
                                .id(UUID.randomUUID())
                                .email(registerRequest.email())
                                .passwordHash(passwordEncoder.encode(registerRequest.password()))
                                .kdfSalt(registerRequest.kdfSalt())
                                .kdfAlgorithm("Argon2id")
                                .encryptedVerification(registerRequest.encryptedVerification())
                                .verificationNonce(registerRequest.verificationNonce())
                                .publicKey(registerRequest.publicKey())
                                .encryptedPrivateKey(registerRequest.encryptedPrivateKey())
                                .privateKeyNonce(registerRequest.privateKeyNonce())
                                .build();

                userRepository.save(user);

                String token = jwtService.generateToken(user.getId());

                return new AuthResponse(
                                token,
                                user.getKdfSalt(),
                                user.getEncryptedVerification(),
                                user.getVerificationNonce(),
                                user.isTotpEnabled(),
                                user.getTotpSecret(),
                                user.getPublicKey(),
                                user.getEncryptedPrivateKey(),
                                user.getPrivateKeyNonce());

        }

        /**
         * Authentifie un utilisateur à l'aide de ses identifiants. Gère également le contrôle du code MFA si activé.
         *
         * @param loginRequest Les informations de connexion (email, mot de passe et code TOTP optionnel)
         * @return La réponse d'authentification contenant le jeton JWT si la connexion réussit
         * @throws ResponseStatusException En cas d'identifiants incorrects (401 Unauthorized) ou de code MFA invalide
         */
        public AuthResponse login(LoginRequest loginRequest) {

                User user = userRepository.findByEmail(loginRequest.email())
                                .orElseThrow(() -> new ResponseStatusException(
                                                 HttpStatus.UNAUTHORIZED,
                                                 "Identifiants incorrects"));

                boolean matches = passwordEncoder.matches(
                                loginRequest.password(),
                                user.getPasswordHash());

                if (!matches) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED, "Identifiants incorrects");
                }

                if (user.isTotpEnabled()) {
                        if (loginRequest.code() == null || loginRequest.code().trim().isEmpty()) {
                                return new AuthResponse(
                                                null,
                                                null,
                                                null,
                                                null,
                                                true,
                                                null,
                                                null,
                                                null,
                                                null);
                        }

                        boolean isValid = totpService.verifyCode(user.getTotpSecret(), loginRequest.code());
                        if (!isValid) {
                                throw new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED, "Code MFA invalide");
                        }
                }

                String token = jwtService.generateToken(user.getId());

                return new AuthResponse(
                                token,
                                user.getKdfSalt(),
                                user.getEncryptedVerification(),
                                user.getVerificationNonce(),
                                user.isTotpEnabled(),
                                null,
                                user.getPublicKey(),
                                user.getEncryptedPrivateKey(),
                                user.getPrivateKeyNonce());

        }

}

