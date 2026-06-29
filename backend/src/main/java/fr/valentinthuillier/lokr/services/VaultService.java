package fr.valentinthuillier.lokr.services;

import fr.valentinthuillier.lokr.dto.CreateVaultItemRequest;
import fr.valentinthuillier.lokr.dto.UpdateVaultItemRequest;
import fr.valentinthuillier.lokr.dto.VaultItemResponse;
import fr.valentinthuillier.lokr.models.Group;
import fr.valentinthuillier.lokr.models.GroupAccess;
import fr.valentinthuillier.lokr.models.GroupAccess.GroupRole;
import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.models.VaultItem;
import fr.valentinthuillier.lokr.repositories.GroupAccessRepository;
import fr.valentinthuillier.lokr.repositories.GroupRepository;
import fr.valentinthuillier.lokr.repositories.VaultItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Service gérant la logique métier liée aux secrets et éléments (VaultItem) stockés dans le coffre-fort.
 * Gère également le contrôle d'accès en lecture/écriture en fonction des permissions de groupe de l'utilisateur.
 */
@Service
@RequiredArgsConstructor
public class VaultService {

    /** Référentiel de gestion des secrets. */
    private final VaultItemRepository vaultItemRepository;

    /** Référentiel de gestion des groupes. */
    private final GroupRepository groupRepository;

    /** Référentiel de gestion des accès de groupe. */
    private final GroupAccessRepository groupAccessRepository;

    /**
     * Crée un nouvel élément (secret) dans le coffre-fort d'un utilisateur.
     * Si l'élément est destiné à un groupe, les droits d'accès et d'écriture de l'utilisateur y sont vérifiés.
     *
     * @param user L'utilisateur à l'origine de la création
     * @param request La requête contenant les données chiffrées du secret et le groupe optionnel associé
     * @return Les détails de l'élément créé
     * @throws ResponseStatusException Si le groupe associé n'existe pas (404) ou si l'utilisateur n'y a pas droit d'accès en écriture (403)
     */
    public VaultItemResponse create(
            User user,
            CreateVaultItemRequest request) {

        Group group = null;
        if (request.groupId() != null) {
            group = groupRepository.findById(request.groupId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Groupe introuvable"));
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(request.groupId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible d'ajouter des éléments avec un accès en lecture seule");
            }
        }

        VaultItem item = VaultItem.builder()
                .user(user)
                .encryptedName(request.encryptedName())
                .encryptedUsername(request.encryptedUsername())
                .encryptedPassword(request.encryptedPassword())
                .encryptedUrl(request.encryptedUrl())
                .encryptedNotes(request.encryptedNotes())
                .nonce(request.nonce())
                .group(group)
                .build();

        vaultItemRepository.save(item);

        return map(item);

    }

    /**
     * Récupère tous les secrets accessibles par l'utilisateur connecté (ses secrets personnels et ceux partagés dans ses groupes).
     *
     * @param user L'utilisateur demandant ses secrets
     * @return La liste des secrets accessibles
     */
    public List<VaultItemResponse> findAll(User user) {

        return vaultItemRepository
                .findAllByUserIdOrGroupAccessOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::map)
                .toList();

    }

    /**
     * Met à jour un secret du coffre-fort. Vérifie l'accès en écriture de l'utilisateur sur le secret (personnel ou groupe).
     *
     * @param id L'identifiant unique du secret à mettre à jour
     * @param user L'utilisateur demandant la modification
     * @param request Les nouvelles données chiffrées et les liaisons de groupe
     * @return Le secret mis à jour
     * @throws ResponseStatusException Si le secret n'existe pas (404) ou si l'utilisateur n'a pas les droits d'écriture requis (403)
     */
    public VaultItemResponse update(
            UUID id,
            User user,
            UpdateVaultItemRequest request) {

        VaultItem item = vaultItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Élément du coffre-fort introuvable"));

        // Access check for existing item
        if (item.getGroup() != null) {
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(item.getGroup().getId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible de modifier des éléments avec un accès en lecture seule");
            }
        } else {
            if (!item.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action interdite");
            }
        }

        // Access check for target group if changed/set
        Group group = null;
        if (request.groupId() != null) {
            group = groupRepository.findById(request.groupId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Groupe introuvable"));
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(request.groupId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe cible"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible de déplacer des éléments vers un groupe en lecture seule");
            }
        }

        item.setEncryptedName(request.encryptedName());
        item.setEncryptedUsername(request.encryptedUsername());
        item.setEncryptedPassword(request.encryptedPassword());
        item.setEncryptedUrl(request.encryptedUrl());
        item.setEncryptedNotes(request.encryptedNotes());
        item.setNonce(request.nonce());
        item.setGroup(group);

        vaultItemRepository.save(item);

        return map(item);
    }

    /**
     * Supprime un secret du coffre-fort. Vérifie l'accès en écriture/suppression.
     *
     * @param id L'identifiant unique du secret à supprimer
     * @param user L'utilisateur demandant la suppression
     * @throws ResponseStatusException Si le secret n'existe pas (404) ou si les droits de l'utilisateur sont insuffisants (403)
     */
    public void delete(UUID id, User user) {
        VaultItem item = vaultItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Élément du coffre-fort introuvable"));

        if (item.getGroup() != null) {
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(item.getGroup().getId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé au groupe"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Impossible de supprimer des éléments avec un accès en lecture seule");
            }
        } else {
            if (!item.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Action interdite");
            }
        }

        vaultItemRepository.deleteById(id);
    }

    /**
     * Convertit une entité VaultItem en objet de transfert de données VaultItemResponse.
     *
     * @param item L'entité à convertir
     * @return Le DTO correspondant
     */
    private VaultItemResponse map(VaultItem item) {

        return new VaultItemResponse(
                item.getId(),
                item.getFolder() != null ? item.getFolder().getId() : null,
                item.getGroup() != null ? item.getGroup().getId() : null,
                item.getEncryptedName(),
                item.getEncryptedUsername(),
                item.getEncryptedPassword(),
                item.getEncryptedUrl(),
                item.getEncryptedNotes(),
                item.getNonce(),
                item.getCreatedAt(),
                item.getUpdatedAt());
    }

}
