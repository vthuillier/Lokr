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

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final VaultItemRepository vaultItemRepository;

    public FolderResponse create(User user, FolderRequest request) {
        Folder folder = Folder.builder()
                .user(user)
                .encryptedName(request.encryptedName())
                .nonce(request.nonce())
                .build();

        return toResponse(folderRepository.save(folder));
    }

    public List<FolderResponse> findAll(User user) {
        return folderRepository.findAllByUserOrderByCreatedAtAsc(user).stream().map(this::toResponse).toList();
    }

    public FolderResponse update(User user, UUID id, FolderRequest request) {
        Folder folder = folderRepository.findById(id)
                .filter(f -> f.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        folder.setEncryptedName(request.encryptedName());
        folder.setNonce(request.nonce());
        return toResponse(folderRepository.save(folder));
    }

    public void delete(User user, UUID id) {
        Folder folder = folderRepository.findById(id)
                .filter(f -> f.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        folderRepository.delete(folder);
    }

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

    private FolderResponse toResponse(Folder f) {
        return new FolderResponse(f.getId(), f.getEncryptedName(),
                f.getNonce(), f.getCreatedAt(), f.getUpdatedAt());
    }

}
