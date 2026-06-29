package fr.valentinthuillier.lokr.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Entité représentant un élément du coffre-fort (mot de passe, notes, etc.).
 * Toutes les données sensibles y sont stockées de manière chiffrée.
 */
@Entity
@Table(name = "vault_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VaultItem {

    /** Identifiant unique de l'élément. */
    @Id
    private UUID id;

    /** Utilisateur propriétaire de l'élément (ou créateur s'il s'agit d'un groupe). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Nom de l'élément chiffré. */
    @Column(name = "encrypted_name", nullable = false, columnDefinition = "TEXT")
    private String encryptedName;

    /** Identifiant/nom d'utilisateur chiffré associé à ce secret. */
    @Column(name = "encrypted_username", columnDefinition = "TEXT")
    private String encryptedUsername;

    /** Mot de passe chiffré associé à ce secret. */
    @Column(name = "encrypted_password", columnDefinition = "TEXT")
    private String encryptedPassword;

    /** URL chiffrée associée à ce secret. */
    @Column(name = "encrypted_url", columnDefinition = "TEXT")
    private String encryptedUrl;

    /** Notes chiffrées supplémentaires. */
    @Column(name = "encrypted_notes", columnDefinition = "TEXT")
    private String encryptedNotes;

    /** Nonce de chiffrement unique pour cet élément. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String nonce;

    /** Date et heure de création de l'élément. */
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Date et heure de la dernière mise à jour. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Dossier parent dans lequel se trouve l'élément (optionnel). */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "folder_id", nullable = true)
    private Folder folder;

    /** Groupe avec lequel cet élément est partagé (optionnel). */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "group_id", nullable = true)
    private Group group;

    /**
     * Méthode exécutée avant l'insertion en base de données.
     * Initialise l'identifiant UUID et les dates de création et de mise à jour.
     */
    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }

        Instant now = Instant.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    /**
     * Méthode exécutée avant chaque mise à jour en base de données.
     * Actualise la date de mise à jour.
     */
    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

}
