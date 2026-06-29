package fr.valentinthuillier.lokr.repositories;

import fr.valentinthuillier.lokr.models.VaultItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Référentiel de données (Repository) pour l'accès aux secrets/éléments du coffre-fort (VaultItem) en base de données.
 */
public interface VaultItemRepository extends JpaRepository<VaultItem, UUID> {

    /**
     * Recherche tous les éléments appartenant directement à un utilisateur, ordonnés par date de création décroissante.
     *
     * @param userId L'identifiant unique de l'utilisateur
     * @return La liste des éléments de coffre-fort correspondants
     */
    List<VaultItem> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Recherche tous les éléments de coffre-fort accessibles par un utilisateur.
     * Cela inclut ses éléments personnels non partagés ainsi que les éléments des groupes dont il fait partie.
     * Les résultats sont ordonnés par date de création décroissante.
     *
     * @param userId L'identifiant unique de l'utilisateur
     * @return La liste des éléments de coffre-fort accessibles
     */
    @Query("SELECT vi FROM VaultItem vi WHERE (vi.user.id = :userId AND vi.group IS NULL) OR (vi.group.id IN (SELECT ga.group.id FROM GroupAccess ga WHERE ga.user.id = :userId)) ORDER BY vi.createdAt DESC")
    List<VaultItem> findAllByUserIdOrGroupAccessOrderByCreatedAtDesc(@Param("userId") UUID userId);

}
