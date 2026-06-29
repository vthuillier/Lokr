package fr.valentinthuillier.lokr.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Entité représentant un utilisateur de l'application SafeVault.
 * Contient les informations d'authentification, les clés cryptographiques et les paramètres TOTP.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    /** Identifiant unique de l'utilisateur. */
    @Id
    private UUID id;

    /** Adresse email unique de l'utilisateur. */
    @Column(nullable = false, unique = true)
    private String email;

    /** Empreinte de mot de passe (hash). */
    @Column(name = "password_hash", nullable = false, columnDefinition = "TEXT")
    private String passwordHash;

    /** Sel utilisé pour la fonction de dérivation de clé (KDF). */
    @Column(name = "kdf_salt", nullable = false, columnDefinition = "TEXT")
    private String kdfSalt;

    /** Algorithme de dérivation de clé utilisé. */
    @Column(name = "kdf_algorithm", nullable = false, columnDefinition = "TEXT")
    private String kdfAlgorithm;

    /** Texte chiffré permettant de vérifier la validité du mot de passe maître de l'utilisateur. */
    @Column(name = "encrypted_verification", columnDefinition = "TEXT")
    private String encryptedVerification;

    /** Nonce associé à la vérification du mot de passe. */
    @Column(name = "verification_nonce", columnDefinition = "TEXT")
    private String verificationNonce;

    /** Date de création du compte utilisateur. */
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Secret TOTP utilisé pour la double authentification (2FA). */
    @Column(name = "totp_secret", nullable = true, columnDefinition = "TEXT")
    private String totpSecret;

    /** Indique si le TOTP est activé pour l'utilisateur. */
    @Column(name = "totp_enabled", nullable = false, columnDefinition = "BOOLEAN")
    private boolean totpEnabled;

    /** Clé asymétrique publique de l'utilisateur. */
    @Column(name = "public_key", columnDefinition = "TEXT")
    private String publicKey;

    /** Clé asymétrique privée de l'utilisateur, chiffrée avec son mot de passe maître. */
    @Column(name = "encrypted_private_key", columnDefinition = "TEXT")
    private String encryptedPrivateKey;

    /** Nonce associé à la clé privée chiffrée. */
    @Column(name = "private_key_nonce", columnDefinition = "TEXT")
    private String privateKeyNonce;

    /**
     * Méthode exécutée avant l'insertion en base de données.
     * Génère un identifiant UUID et définit la date de création si nécessaire.
     */
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
