package fr.valentinthuillier.lokr.services;

import fr.valentinthuillier.lokr.dto.*;
import fr.valentinthuillier.lokr.models.Group;
import fr.valentinthuillier.lokr.models.GroupAccess;
import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.repositories.GroupAccessRepository;
import fr.valentinthuillier.lokr.repositories.GroupRepository;
import fr.valentinthuillier.lokr.repositories.UserRepository;
import fr.valentinthuillier.lokr.repositories.VaultItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service gérant la logique métier liée aux groupes d'utilisateurs (partage de secrets).
 * Gère la création de groupes, l'attribution des rôles (ADMIN, MEMBER, VIEWER), l'ajout/suppression de membres,
 * ainsi que le renouvellement des clés de groupe lors du départ d'un membre.
 */
@Service
@RequiredArgsConstructor
public class GroupService {

    /** Référentiel de gestion des groupes. */
    private final GroupRepository groupRepository;

    /** Référentiel de gestion des droits d'accès aux groupes. */
    private final GroupAccessRepository groupAccessRepository;

    /** Référentiel de gestion des utilisateurs. */
    private final UserRepository userRepository;

    /** Référentiel de gestion des secrets. */
    private final VaultItemRepository vaultItemRepository;

    /**
     * Crée un nouveau groupe d'utilisateurs et affecte le rôle d'administrateur (ADMIN) au créateur.
     *
     * @param creator L'utilisateur créant le groupe
     * @param request La requête contenant le nom du groupe et la clé symétrique chiffrée pour le créateur
     * @return Les détails du groupe créé
     */
    @Transactional
    public GroupResponse createGroup(User creator, CreateGroupRequest request) {
        Group group = Group.builder()
                .name(request.name())
                .build();
        group = groupRepository.save(group);

        GroupAccess access = GroupAccess.builder()
                .user(creator)
                .group(group)
                .encryptedGroupKey(request.encryptedGroupKey())
                .role(GroupRole.ADMIN)
                .build();
        groupAccessRepository.save(access);

        return new GroupResponse(group.getId(), group.getName(), access.getRole(), access.getEncryptedGroupKey());
    }

    /**
     * Récupère la liste de tous les groupes auxquels l'utilisateur a accès.
     *
     * @param user L'utilisateur demandant la liste des groupes
     * @return La liste des réponses contenant les groupes de l'utilisateur
     */
    @Transactional(readOnly = true)
    public List<GroupResponse> findAll(User user) {
        return groupAccessRepository.findAllByUser(user).stream()
                .map(access -> new GroupResponse(
                        access.getGroup().getId(),
                        access.getGroup().getName(),
                        access.getRole(),
                        access.getEncryptedGroupKey()
                ))
                .toList();
    }

    /**
     * Recherche les informations d'un groupe spécifique pour un utilisateur donné.
     *
     * @param user L'utilisateur demandant les informations
     * @param groupId L'identifiant unique du groupe
     * @return Les informations du groupe
     * @throws ResponseStatusException Si l'accès au groupe est refusé ou inexistant (403 Forbidden)
     */
    @Transactional(readOnly = true)
    public GroupResponse findById(User user, UUID groupId) {
        GroupAccess access = groupAccessRepository.findByGroupIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));

        return new GroupResponse(
                access.getGroup().getId(),
                access.getGroup().getName(),
                access.getRole(),
                access.getEncryptedGroupKey()
        );
    }

    /**
     * Supprime un groupe. Cette action requiert le rôle d'administrateur (ADMIN).
     *
     * @param user L'utilisateur demandant la suppression
     * @param groupId L'identifiant unique du groupe à supprimer
     * @throws ResponseStatusException Si l'utilisateur n'a pas accès au groupe ou n'est pas ADMIN (403 Forbidden)
     */
    @Transactional
    public void deleteGroup(User user, UUID groupId) {
        GroupAccess access = groupAccessRepository.findByGroupIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));

        if (access.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seuls les administrateurs peuvent supprimer le groupe");
        }

        Group group = access.getGroup();
        groupRepository.delete(group);
    }

    /**
     * Récupère la liste de tous les membres d'un groupe.
     *
     * @param user L'utilisateur effectuant la demande (doit faire partie du groupe)
     * @param groupId L'identifiant unique du groupe
     * @return La liste des membres du groupe et leurs rôles
     * @throws ResponseStatusException Si l'utilisateur n'a pas accès au groupe (403 Forbidden)
     */
    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getMembers(User user, UUID groupId) {
        // Verify current user belongs to group
        groupAccessRepository.findByGroupIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));

        return groupAccessRepository.findAllByGroupId(groupId).stream()
                .map(access -> new GroupMemberResponse(
                        access.getUser().getId(),
                        access.getUser().getEmail(),
                        access.getRole(),
                        access.getEncryptedGroupKey(),
                        access.getUser().getPublicKey()
                ))
                .toList();
    }

    /**
     * Ajoute un nouvel utilisateur au groupe. Cette action requiert le rôle ADMIN.
     *
     * @param currentUser L'utilisateur actuel effectuant l'ajout
     * @param groupId L'identifiant unique du groupe
     * @param request La requête contenant l'email du nouveau membre, son rôle et la clé du groupe chiffrée avec sa clé publique
     * @throws ResponseStatusException Si l'utilisateur actuel n'est pas ADMIN, si l'utilisateur cible n'existe pas (404) ou s'il est déjà membre (409)
     */
    @Transactional
    public void addMember(User currentUser, UUID groupId, AddMemberRequest request) {
        GroupAccess currentAccess = groupAccessRepository.findByGroupIdAndUser(groupId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));

        if (currentAccess.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seuls les administrateurs peuvent ajouter des membres au groupe");
        }

        User targetUser = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));

        if (groupAccessRepository.findByGroupIdAndUserId(groupId, targetUser.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "L'utilisateur est déjà membre du groupe");
        }

        GroupAccess newAccess = GroupAccess.builder()
                .user(targetUser)
                .group(currentAccess.getGroup())
                .encryptedGroupKey(request.encryptedGroupKey())
                .role(request.role())
                .build();
        groupAccessRepository.save(newAccess);
    }

    /**
     * Met à jour le rôle d'un membre existant dans le groupe. Requiert le rôle ADMIN.
     *
     * @param currentUser L'utilisateur actuel effectuant la modification
     * @param groupId L'identifiant unique du groupe
     * @param targetUserId L'identifiant unique de l'utilisateur ciblé
     * @param request La requête contenant le nouveau rôle
     * @throws ResponseStatusException Si l'utilisateur actuel n'est pas ADMIN, si la cible est introuvable (404), ou si l'action tente de supprimer le dernier ADMIN
     */
    @Transactional
    public void updateMember(User currentUser, UUID groupId, UUID targetUserId, UpdateMemberRequest request) {
        GroupAccess currentAccess = groupAccessRepository.findByGroupIdAndUser(groupId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));

        if (currentAccess.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seuls les administrateurs peuvent modifier les rôles des membres");
        }

        GroupAccess targetAccess = groupAccessRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membre introuvable dans le groupe"));

        // Safeguard: Do not allow changing the last admin's role to something else
        if (targetAccess.getRole() == GroupRole.ADMIN && request.role() != GroupRole.ADMIN) {
            long adminCount = groupAccessRepository.findAllByGroupId(groupId).stream()
                    .filter(a -> a.getRole() == GroupRole.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impossible de modifier le rôle de l'unique administrateur du groupe");
            }
        }

        targetAccess.setRole(request.role());
        groupAccessRepository.save(targetAccess);
    }

    /**
     * Retire un membre du groupe. Requiert le rôle ADMIN (ou que le membre se retire lui-même).
     * Si des secrets et des clés doivent être ré-encryptés pour les membres restants afin de révoquer l'accès aux données du membre sortant,
     * les nouvelles versions chiffrées sont transmises dans la requête.
     *
     * @param currentUser L'utilisateur actuel effectuant la suppression
     * @param groupId L'identifiant unique du groupe
     * @param targetUserId L'identifiant unique du membre à retirer
     * @param request La requête contenant les nouvelles clés chiffrées pour les membres restants et les secrets ré-encryptés
     * @throws ResponseStatusException Si l'accès est refusé, si le membre est introuvable, ou s'il s'agit du dernier administrateur dans un groupe non vide
     */
    @Transactional
    public void removeMember(User currentUser, UUID groupId, UUID targetUserId, RemoveMemberRequest request) {
        GroupAccess currentAccess = groupAccessRepository.findByGroupIdAndUser(groupId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));

        boolean isSelfRemoving = currentUser.getId().equals(targetUserId);

        if (!isSelfRemoving && currentAccess.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seuls les administrateurs peuvent retirer des membres");
        }

        GroupAccess targetAccess = groupAccessRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membre introuvable dans le groupe"));

        // Safeguard: Check if we are removing the last admin
        if (targetAccess.getRole() == GroupRole.ADMIN) {
            long adminCount = groupAccessRepository.findAllByGroupId(groupId).stream()
                    .filter(a -> a.getRole() == GroupRole.ADMIN)
                    .count();
            
            if (adminCount <= 1) {
                // If there are other members left, we can't leave the group adminless
                long totalCount = groupAccessRepository.findAllByGroupId(groupId).size();
                if (totalCount > 1) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Impossible de retirer le seul administrateur lorsque d'autres membres sont présents. Veuillez désigner un autre administrateur d'abord.");
                } else {
                    // If it is the last person in the group, we can delete the group
                    groupRepository.delete(currentAccess.getGroup());
                    return;
                }
            }
        }

        // Delete the access of the target user
        groupAccessRepository.delete(targetAccess);

        // Update the keys of the remaining members
        if (request != null && request.newGroupKeys() != null) {
            for (Map.Entry<UUID, String> entry : request.newGroupKeys().entrySet()) {
                UUID userId = entry.getKey();
                String newKey = entry.getValue();

                GroupAccess access = groupAccessRepository.findByGroupIdAndUserId(groupId, userId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Membre " + userId + " introuvable dans le groupe"));
                access.setEncryptedGroupKey(newKey);
                groupAccessRepository.save(access);
            }
        }

        // Update the re-encrypted group items
        if (request != null && request.reencryptedItems() != null) {
            for (ReencryptedItemRequest itemReq : request.reencryptedItems()) {
                fr.valentinthuillier.lokr.models.VaultItem item = vaultItemRepository.findById(itemReq.id())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Élément de coffre-fort introuvable"));
                if (item.getGroup() == null || !item.getGroup().getId().equals(groupId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'élément n'appartient pas au groupe");
                }
                item.setEncryptedName(itemReq.encryptedName());
                item.setEncryptedUsername(itemReq.encryptedUsername());
                item.setEncryptedPassword(itemReq.encryptedPassword());
                item.setEncryptedUrl(itemReq.encryptedUrl());
                item.setEncryptedNotes(itemReq.encryptedNotes());
                item.setNonce(itemReq.nonce());
                vaultItemRepository.save(item);
            }
        }
    }

}
