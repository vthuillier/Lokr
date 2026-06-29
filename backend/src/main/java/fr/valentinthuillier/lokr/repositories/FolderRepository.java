package fr.valentinthuillier.lokr.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import fr.valentinthuillier.lokr.models.Folder;
import fr.valentinthuillier.lokr.models.User;

/**
 * Référentiel de données (Repository) pour l'accès aux dossiers (Folder) en base de données.
 */
public interface FolderRepository extends JpaRepository<Folder, UUID> {
    /**
     * Recherche tous les dossiers appartenant à un utilisateur, ordonnés par date de création croissante.
     *
     * @param user L'utilisateur propriétaire des dossiers
     * @return La liste des dossiers correspondants
     */
    List<Folder> findAllByUserOrderByCreatedAtAsc(User user);

    /**
     * Vérifie si un dossier existe pour un identifiant donné et un utilisateur donné.
     *
     * @param id L'identifiant du dossier
     * @param user L'utilisateur propriétaire
     * @return true si le dossier existe, false sinon
     */
    boolean existsByIdAndUser(UUID id, User user);
}
