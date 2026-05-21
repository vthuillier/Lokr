package fr.valentinthuillier.safevault.services;

import fr.valentinthuillier.safevault.dto.CreateVaultItemRequest;
import fr.valentinthuillier.safevault.dto.UpdateVaultItemRequest;
import fr.valentinthuillier.safevault.dto.VaultItemResponse;
import fr.valentinthuillier.safevault.models.User;
import fr.valentinthuillier.safevault.models.VaultItem;
import fr.valentinthuillier.safevault.repositories.VaultItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VaultService {

    private final VaultItemRepository vaultItemRepository;

    public VaultItemResponse create(
            User user,
            CreateVaultItemRequest request) {

        VaultItem item = VaultItem.builder()
                .user(user)
                .encryptedName(request.encryptedName())
                .encryptedUsername(request.encryptedUsername())
                .encryptedPassword(request.encryptedPassword())
                .encryptedUrl(request.encryptedUrl())
                .encryptedNotes(request.encryptedNotes())
                .nonce(request.nonce())
                .build();

        vaultItemRepository.save(item);

        return map(item);

    }

    public List<VaultItemResponse> findAll(User user) {

        return vaultItemRepository
                .findAllByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::map)
                .toList();

    }

    public VaultItemResponse update(
            UUID id,
            User user,
            UpdateVaultItemRequest request) {

        VaultItem item = vaultItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vault item not found"));

        if (!item.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        item.setEncryptedName(request.encryptedName());
        item.setEncryptedUsername(request.encryptedUsername());
        item.setEncryptedPassword(request.encryptedPassword());
        item.setEncryptedUrl(request.encryptedUrl());
        item.setEncryptedNotes(request.encryptedNotes());
        item.setNonce(request.nonce());

        vaultItemRepository.save(item);

        return map(item);
    }

    public void delete(UUID id, User user) {
        VaultItem item = vaultItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vault item not found"));

        if (!item.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        vaultItemRepository.deleteById(id);
    }

    private VaultItemResponse map(VaultItem item) {

        return new VaultItemResponse(
                item.getId(),
                item.getFolder() != null ? item.getFolder().getId() : null,
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
