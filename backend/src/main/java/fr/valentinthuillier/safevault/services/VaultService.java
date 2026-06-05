package fr.valentinthuillier.safevault.services;

import fr.valentinthuillier.safevault.dto.CreateVaultItemRequest;
import fr.valentinthuillier.safevault.dto.UpdateVaultItemRequest;
import fr.valentinthuillier.safevault.dto.VaultItemResponse;
import fr.valentinthuillier.safevault.models.Group;
import fr.valentinthuillier.safevault.models.GroupAccess;
import fr.valentinthuillier.safevault.models.GroupAccess.GroupRole;
import fr.valentinthuillier.safevault.models.User;
import fr.valentinthuillier.safevault.models.VaultItem;
import fr.valentinthuillier.safevault.repositories.GroupAccessRepository;
import fr.valentinthuillier.safevault.repositories.GroupRepository;
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
    private final GroupRepository groupRepository;
    private final GroupAccessRepository groupAccessRepository;

    public VaultItemResponse create(
            User user,
            CreateVaultItemRequest request) {

        Group group = null;
        if (request.groupId() != null) {
            group = groupRepository.findById(request.groupId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(request.groupId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot add items with read-only access");
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

    public List<VaultItemResponse> findAll(User user) {

        return vaultItemRepository
                .findAllByUserIdOrGroupAccessOrderByCreatedAtDesc(user.getId())
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

        // Access check for existing item
        if (item.getGroup() != null) {
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(item.getGroup().getId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot update items with read-only access");
            }
        } else {
            if (!item.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
            }
        }

        // Access check for target group if changed/set
        Group group = null;
        if (request.groupId() != null) {
            group = groupRepository.findById(request.groupId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(request.groupId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to target group"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot move items to group with read-only access");
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

    public void delete(UUID id, User user) {
        VaultItem item = vaultItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vault item not found"));

        if (item.getGroup() != null) {
            GroupAccess access = groupAccessRepository.findByGroupIdAndUser(item.getGroup().getId(), user)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));
            if (access.getRole() == GroupRole.VIEWER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete items with read-only access");
            }
        } else {
            if (!item.getUser().getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
            }
        }

        vaultItemRepository.deleteById(id);
    }

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
