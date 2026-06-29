package fr.valentinthuillier.lokr.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Entité représentant l'accès d'un utilisateur à un groupe spécifique.
 * Elle contient également la clé symétrique du groupe, chiffrée avec la clé publique de l'utilisateur.
 */
@Entity
@Table(name = "group_access")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupAccess {

    /** Identifiant unique de l'accès au groupe. */
    @Id
    private UUID id;

    /** Utilisateur concerné par cet accès. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Groupe auquel l'utilisateur a accès. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    /** Clé du groupe chiffrée avec la clé publique de l'utilisateur. */
    @Column(name = "encrypted_group_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedGroupKey;

    /** Rôle de l'utilisateur au sein de ce groupe. */
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private GroupRole role;

    /**
     * Rôles disponibles pour la gestion des accès au sein d'un groupe.
     */
    public enum GroupRole {
        /** Administrateur avec pleins pouvoirs sur le groupe. */
        ADMIN,
        /** Membre pouvant ajouter/modifier des secrets. */
        MEMBER,
        /** Lecteur simple du groupe. */
        VIEWER
    }

    /**
     * Méthode exécutée avant l'insertion en base de données.
     * Initialise l'identifiant UUID s'il est nul, et attribue par défaut le rôle VIEWER.
     */
    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (role == null) {
            role = GroupRole.VIEWER;
        }
    }

}
