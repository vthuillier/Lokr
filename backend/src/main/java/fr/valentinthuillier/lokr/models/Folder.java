package fr.valentinthuillier.lokr.models;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entité représentant un dossier dans le coffre-fort de l'utilisateur.
 * Contient le nom chiffré et le nonce associé.
 */
@Entity
@Table(name = "folders")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Folder {

    /** Identifiant unique du dossier. */
    @Id
    private UUID id;

    /** Propriétaire du dossier. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Nom du dossier chiffré. */
    @Column(name = "encrypted_name", nullable = false, columnDefinition = "TEXT")
    private String encryptedName;

    /** Nonce de chiffrement (sel unique utilisé lors du chiffrement). */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String nonce;

    /** Date et heure de création. */
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** Date et heure de la dernière mise à jour. */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /**
     * Méthode exécutée avant l'insertion en base de données.
     * Initialise l'identifiant UUID s'il est nul, ainsi que les dates de création et de mise à jour.
     */
    @PrePersist
    public void prePersist() {
        if (id == null)
            id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null)
            createdAt = now;
        if (updatedAt == null)
            updatedAt = now;
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
