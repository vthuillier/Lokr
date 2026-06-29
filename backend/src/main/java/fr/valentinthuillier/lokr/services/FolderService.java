package fr.valentinthuillier.lokr.services;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import fr.valentinthuillier.lokr.dto.FolderRequest;
import fr.valentinthuillier.lokr.dto.FolderResponse;
import fr.valentinthuillier.lokr.models.Folder;
import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.models.VaultItem;
import fr.valentinthuillier.lokr.repositories.FolderRepository;
import fr.valentinthuillier.lokr.repositories.VaultItemRepository;
import lombok.RequiredArgsConstructor;

/**
 * Service gérant la logique métier relative aux dossiers (Folders) du coffre-fort.
 */
@Service
@RequiredArgsConstructor
public class FolderService {

    /** Référentiel de gestion des dossiers. */
    private final FolderRepository folderRepository;

    /** Référentiel de gestion des secrets. */
    private final VaultItemRepository vaultItemRepository;

    /**
     * Crée un nouveau dossier pour un utilisateur donné.
     *
     * @param user L'utilisateur propriétaire du dossier
     * @param request Les données de création du dossier (nom chiffré et nonce)
     * @return Les détails du dossier créé
     */
    public FolderResponse create(User user, FolderRequest request) {
        Folder folder = Folder.builder()
                .user(user)
                .encryptedName(request.encryptedName())
                .nonce(request.nonce())
                .build();

        return toResponse(folderRepository.save(folder));
    }

    /**
     * Récupère tous les dossiers d'un utilisateur, triés par date de création.
     *
     * @param user L'utilisateur propriétaire des dossiers
     * @return La liste des dossiers associés
     */
    public List<FolderResponse> findAll(User user) {
        return folderRepository.findAllByUserOrderByCreatedAtAsc(user).stream().map(this::toResponse).toList();
    }

    /**
     * Met à jour le nom chiffré ou le nonce d'un dossier existant.
     *
     * @param user L'utilisateur propriétaire
     * @param id L'identifiant unique du dossier à modifier
     * @param request Les nouvelles données du dossier
     * @return Le dossier mis à jour
     * @throws ResponseStatusException Si le dossier n'existe pas ou n'appartient pas à l'utilisateur (404 Not Found)
     */
    public FolderResponse update(User user, UUID id, FolderRequest request) {
        Folder folder = folderRepository.findById(id)
                .filter(f -> f.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        folder.setEncryptedName(request.encryptedName());
        folder.setNonce(request.nonce());
        return toResponse(folderRepository.save(folder));
    }

    /**
     * Supprime un dossier du coffre-fort de l'utilisateur.
     *
     * @param user L'utilisateur propriétaire
     * @param id L'identifiant unique du dossier à supprimer
     * @throws ResponseStatusException Si le dossier n'existe pas ou n'appartient pas à l'utilisateur (404 Not Found)
     */
    public void delete(User user, UUID id) {
        Folder folder = folderRepository.findById(id)
                .filter(f -> f.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        folderRepository.delete(folder);
    }

    /**
     * Déplace un élément (secret) du coffre-fort vers un dossier spécifié (ou à la racine si folderId est nul).
     *
     * @param user L'utilisateur propriétaire de l'élément et du dossier
     * @param itemId L'identifiant unique de l'élément à déplacer
     * @param folderId L'identifiant unique du dossier de destination (peut être null)
     * @throws ResponseStatusException Si l'élément ou le dossier de destination est introuvable ou n'appartient pas à l'utilisateur
     */
    public void moveItem(User user, UUID itemId, UUID folderId) {
        VaultItem item = vaultItemRepository.findById(itemId)
                .filter(i -> i.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        Folder folder = folderId != null
                ? folderRepository.findById(folderId)
                        .filter(f -> f.getUser().getId().equals(user.getId()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND))
                : null;

        item.setFolder(folder);
        vaultItemRepository.save(item);
    }

    /**
     * Convertit une entité Folder en objet de transfert de données FolderResponse.
     *
     * @param f L'entité dossier à convertir
     * @return Le DTO FolderResponse correspondant
     */
    private FolderResponse toResponse(Folder f) {
        return new FolderResponse(f.getId(), f.getEncryptedName(),
                f.getNonce(), f.getCreatedAt(), f.getUpdatedAt());
    }

}
