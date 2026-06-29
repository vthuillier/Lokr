package fr.valentinthuillier.lokr.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import fr.valentinthuillier.lokr.dto.FolderRequest;
import fr.valentinthuillier.lokr.dto.FolderResponse;
import fr.valentinthuillier.lokr.dto.MoveItemRequest;
import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.services.FolderService;
import lombok.RequiredArgsConstructor;

/**
 * Contrôleur gérant les requêtes relatives aux dossiers (Folders) du coffre-fort d'un utilisateur.
 */
@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    /** Service gérant la logique métier des dossiers. */
    private final FolderService folderService;

    /**
     * Endpoint pour récupérer la liste de tous les dossiers de l'utilisateur authentifié.
     *
     * @param user L'utilisateur authentifié
     * @return La liste des dossiers de l'utilisateur
     */
    @GetMapping
    public List<FolderResponse> getAll(@AuthenticationPrincipal User user) {
        return folderService.findAll(user);
    }

    /**
     * Endpoint pour créer un nouveau dossier.
     *
     * @param user L'utilisateur authentifié créant le dossier
     * @param request Les détails du dossier à créer
     * @return Le dossier créé sous forme de réponse
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderResponse create(@AuthenticationPrincipal User user,
                                  @RequestBody FolderRequest request) {
        return folderService.create(user, request);
    }

    /**
     * Endpoint pour modifier un dossier existant.
     *
     * @param user L'utilisateur authentifié modifiant le dossier
     * @param id L'identifiant unique du dossier à modifier
     * @param request Les nouvelles informations du dossier
     * @return Le dossier mis à jour
     */
    @PutMapping("/{id}")
    public FolderResponse update(@AuthenticationPrincipal User user,
                                  @PathVariable UUID id,
                                  @RequestBody FolderRequest request) {
        return folderService.update(user, id, request);
    }

    /**
     * Endpoint pour supprimer un dossier existant.
     *
     * @param user L'utilisateur authentifié effectuant la suppression
     * @param id L'identifiant unique du dossier à supprimer
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        folderService.delete(user, id);
    }

    /**
     * Endpoint pour déplacer un élément du coffre-fort vers un autre dossier.
     *
     * @param user L'utilisateur authentifié déplaçant l'élément
     * @param itemId L'identifiant unique de l'élément à déplacer
     * @param request La requête contenant le nouvel identifiant du dossier de destination (peut être null pour la racine)
     */
    @PatchMapping("/items/{itemId}/move")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void moveItem(@AuthenticationPrincipal User user,
                          @PathVariable UUID itemId,
                          @RequestBody MoveItemRequest request) {
        folderService.moveItem(user, itemId, request.folderId());
    }
}
