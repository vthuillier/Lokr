package fr.valentinthuillier.lokr.controllers;

import fr.valentinthuillier.lokr.dto.*;
import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.services.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Contrôleur gérant les opérations sur les groupes d'utilisateurs et leurs membres (partage de secrets).
 */
@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    /** Service gérant la logique métier des groupes. */
    private final GroupService groupService;

    /**
     * Endpoint pour créer un nouveau groupe d'utilisateurs.
     *
     * @param user L'utilisateur authentifié créant le groupe (deviendra ADMIN)
     * @param request La requête contenant le nom du groupe et la clé chiffrée
     * @return Les informations du groupe créé
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@AuthenticationPrincipal User user,
                                 @Valid @RequestBody CreateGroupRequest request) {
        return groupService.createGroup(user, request);
    }

    /**
     * Endpoint pour récupérer la liste de tous les groupes dont fait partie l'utilisateur authentifié.
     *
     * @param user L'utilisateur authentifié
     * @return La liste des groupes associés
     */
    @GetMapping
    public List<GroupResponse> getAll(@AuthenticationPrincipal User user) {
        return groupService.findAll(user);
    }

    /**
     * Endpoint pour récupérer les détails d'un groupe spécifique par son identifiant.
     *
     * @param user L'utilisateur authentifié
     * @param id L'identifiant unique du groupe
     * @return Les détails du groupe
     */
    @GetMapping("/{id}")
    public GroupResponse getById(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return groupService.findById(user, id);
    }

    /**
     * Endpoint pour supprimer un groupe.
     *
     * @param user L'utilisateur authentifié effectuant la suppression (doit être ADMIN)
     * @param id L'identifiant unique du groupe à supprimer
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        groupService.deleteGroup(user, id);
    }

    /**
     * Endpoint pour lister les membres d'un groupe donné.
     *
     * @param user L'utilisateur authentifié
     * @param groupId L'identifiant unique du groupe
     * @return La liste des membres du groupe
     */
    @GetMapping("/{groupId}/members")
    public List<GroupMemberResponse> getMembers(@AuthenticationPrincipal User user,
                                                @PathVariable UUID groupId) {
        return groupService.getMembers(user, groupId);
    }

    /**
     * Endpoint pour ajouter un nouveau membre à un groupe.
     *
     * @param user L'utilisateur authentifié effectuant l'action (doit être ADMIN)
     * @param groupId L'identifiant unique du groupe
     * @param request Les détails de l'invitation (email, rôle, clé du groupe chiffrée pour le membre)
     */
    @PostMapping("/{groupId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public void addMember(@AuthenticationPrincipal User user,
                          @PathVariable UUID groupId,
                          @Valid @RequestBody AddMemberRequest request) {
        groupService.addMember(user, groupId, request);
    }

    /**
     * Endpoint pour modifier le rôle d'un membre dans un groupe.
     *
     * @param user L'utilisateur authentifié effectuant l'action (doit être ADMIN)
     * @param groupId L'identifiant unique du groupe
     * @param userId L'identifiant unique du membre à mettre à jour
     * @param request Le nouveau rôle pour ce membre
     */
    @PutMapping("/{groupId}/members/{userId}")
    public void updateMember(@AuthenticationPrincipal User user,
                             @PathVariable UUID groupId,
                             @PathVariable UUID userId,
                             @Valid @RequestBody UpdateMemberRequest request) {
        groupService.updateMember(user, groupId, userId, request);
    }

    /**
     * Endpoint pour retirer un membre d'un groupe.
     *
     * @param user L'utilisateur authentifié (doit être ADMIN ou le membre lui-même s'il quitte le groupe)
     * @param groupId L'identifiant unique du groupe
     * @param userId L'identifiant unique du membre à retirer
     * @param request Les détails requis pour la suppression (notamment pour ré-encrypter les items si nécessaire)
     */
    @PostMapping("/{groupId}/members/{userId}/remove")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@AuthenticationPrincipal User user,
                             @PathVariable UUID groupId,
                             @PathVariable UUID userId,
                             @Valid @RequestBody RemoveMemberRequest request) {
        groupService.removeMember(user, groupId, userId, request);
    }

}
