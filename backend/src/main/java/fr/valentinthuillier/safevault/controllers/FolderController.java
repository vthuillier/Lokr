package fr.valentinthuillier.safevault.controllers;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import fr.valentinthuillier.safevault.dto.FolderRequest;
import fr.valentinthuillier.safevault.dto.FolderResponse;
import fr.valentinthuillier.safevault.dto.MoveItemRequest;
import fr.valentinthuillier.safevault.models.User;
import fr.valentinthuillier.safevault.services.FolderService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @GetMapping
    public List<FolderResponse> getAll(@AuthenticationPrincipal User user) {
        return folderService.findAll(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderResponse create(@AuthenticationPrincipal User user,
                                  @RequestBody FolderRequest request) {
        return folderService.create(user, request);
    }

    @PutMapping("/{id}")
    public FolderResponse update(@AuthenticationPrincipal User user,
                                  @PathVariable UUID id,
                                  @RequestBody FolderRequest request) {
        return folderService.update(user, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        folderService.delete(user, id);
    }

    @PatchMapping("/items/{itemId}/move")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void moveItem(@AuthenticationPrincipal User user,
                          @PathVariable UUID itemId,
                          @RequestBody MoveItemRequest request) {
        folderService.moveItem(user, itemId, request.folderId());
    }
}