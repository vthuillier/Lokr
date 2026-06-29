package fr.valentinthuillier.lokr.repositories;

import fr.valentinthuillier.lokr.models.GroupAccess;
import fr.valentinthuillier.lokr.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Référentiel de données (Repository) pour l'accès aux droits et relations des groupes (GroupAccess) en base de données.
 */
public interface GroupAccessRepository extends JpaRepository<GroupAccess, UUID> {
    /**
     * Recherche tous les accès de groupe associés à un utilisateur spécifique.
     *
     * @param user L'utilisateur dont on recherche les accès de groupe
     * @return La liste des accès de groupe correspondants
     */
    List<GroupAccess> findAllByUser(User user);

    /**
     * Recherche tous les accès associés à un groupe donné.
     *
     * @param groupId L'identifiant unique du groupe
     * @return La liste des accès de groupe correspondants
     */
    List<GroupAccess> findAllByGroupId(UUID groupId);

    /**
     * Recherche l'accès d'un utilisateur spécifique à un groupe donné.
     *
     * @param groupId L'identifiant unique du groupe
     * @param userId L'identifiant unique de l'utilisateur
     * @return Un Optional contenant l'accès s'il existe
     */
    Optional<GroupAccess> findByGroupIdAndUserId(UUID groupId, UUID userId);

    /**
     * Recherche l'accès d'un utilisateur spécifique à un groupe donné.
     *
     * @param groupId L'identifiant unique du groupe
     * @param user L'utilisateur concerné
     * @return Un Optional contenant l'accès s'il existe
     */
    Optional<GroupAccess> findByGroupIdAndUser(UUID groupId, User user);

    /**
     * Vérifie si un utilisateur possède un rôle spécifique au sein d'un groupe.
     *
     * @param groupId L'identifiant unique du groupe
     * @param userId L'identifiant unique de l'utilisateur
     * @param role Le rôle recherché
     * @return true si l'accès existe avec ce rôle, false sinon
     */
    boolean existsByGroupIdAndUserIdAndRole(UUID groupId, UUID userId, GroupAccess.GroupRole role);
}
