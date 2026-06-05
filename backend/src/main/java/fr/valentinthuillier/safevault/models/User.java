package fr.valentinthuillier.safevault.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false, columnDefinition = "TEXT")
    private String passwordHash;

    @Column(name = "kdf_salt", nullable = false, columnDefinition = "TEXT")
    private String kdfSalt;

    @Column(name = "kdf_algorithm", nullable = false, columnDefinition = "TEXT")
    private String kdfAlgorithm;

    @Column(name = "encrypted_verification", columnDefinition = "TEXT")
    private String encryptedVerification;

    @Column(name = "verification_nonce", columnDefinition = "TEXT")
    private String verificationNonce;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "totp_secret", nullable = true, columnDefinition = "TEXT")
    private String totpSecret;

    @Column(name = "totp_enabled", nullable = false, columnDefinition = "BOOLEAN")
    private boolean totpEnabled;

    @Column(name = "public_key", columnDefinition = "TEXT")
    private String publicKey;

    @Column(name = "encrypted_private_key", columnDefinition = "TEXT")
    private String encryptedPrivateKey;

    @Column(name = "private_key_nonce", columnDefinition = "TEXT")
    private String privateKeyNonce;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

}
