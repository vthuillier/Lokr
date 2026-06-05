package fr.valentinthuillier.safevault.services;

import fr.valentinthuillier.safevault.dto.AuthResponse;
import fr.valentinthuillier.safevault.dto.LoginRequest;
import fr.valentinthuillier.safevault.dto.RegisterRequest;
import fr.valentinthuillier.safevault.models.User;
import fr.valentinthuillier.safevault.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final TotpService totpService;

        public AuthResponse register(RegisterRequest registerRequest) {

                if (userRepository.existsByEmail(registerRequest.email())) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
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

        public AuthResponse login(LoginRequest loginRequest) {

                User user = userRepository.findByEmail(loginRequest.email())
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "Invalid credentials"));

                boolean matches = passwordEncoder.matches(
                                loginRequest.password(),
                                user.getPasswordHash());

                if (!matches) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED, "Invalid credentials");
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

