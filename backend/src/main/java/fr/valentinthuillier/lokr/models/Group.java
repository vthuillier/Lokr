package fr.valentinthuillier.lokr.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Entité représentant un groupe d'utilisateurs pour le partage de secrets.
 */
@Entity
@Table(name = "groups")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Group {

    /** Identifiant unique du groupe. */
    @Id
    private UUID id;

    /** Nom du groupe. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String name;

    /**
     * Méthode exécutée avant l'insertion en base de données.
     * Initialise l'identifiant UUID s'il est nul.
     */
    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
    
}
