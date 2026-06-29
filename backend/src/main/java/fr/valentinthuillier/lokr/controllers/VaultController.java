package fr.valentinthuillier.lokr.controllers;

import fr.valentinthuillier.lokr.models.User;
import fr.valentinthuillier.lokr.dto.CreateVaultItemRequest;
import fr.valentinthuillier.lokr.dto.UpdateVaultItemRequest;
import fr.valentinthuillier.lokr.dto.VaultItemResponse;
import fr.valentinthuillier.lokr.services.VaultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Contrôleur gérant les opérations sur les secrets/éléments (VaultItem) stockés dans le coffre-fort.
 */
@RestController
@RequestMapping("/api/vault/items")
@RequiredArgsConstructor
public class VaultController {

    /** Service de gestion des éléments du coffre-fort. */
    private final VaultService vaultService;

    /**
     * Endpoint pour créer un nouvel élément (secret) dans le coffre-fort.
     *
     * @param user L'utilisateur authentifié créant le secret
     * @param request La requête contenant les données chiffrées du secret à ajouter
     * @return Les détails de l'élément créé
     */
    @PostMapping
    public VaultItemResponse create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateVaultItemRequest request
    ) {
        return vaultService.create(user, request);
    }

    /**
     * Endpoint pour récupérer tous les éléments accessibles par l'utilisateur connecté (personnels ou partagés via des groupes).
     *
     * @param user L'utilisateur authentifié
     * @return La liste de tous ses éléments de coffre-fort
     */
    @GetMapping
    public List<VaultItemResponse> findAll(
            @AuthenticationPrincipal User user
    ) {
        return vaultService.findAll(user);
    }

    /**
     * Endpoint pour mettre à jour un secret existant.
     *
     * @param id L'identifiant unique du secret à mettre à jour
     * @param user L'utilisateur authentifié modifiant le secret
     * @param request Les nouvelles données chiffrées du secret
     * @return Le secret mis à jour
     */
    @PutMapping("/{id}")
    public VaultItemResponse update(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateVaultItemRequest request
    ) {
        return vaultService.update(id, user, request);
    }

    /**
     * Endpoint pour supprimer un secret du coffre-fort.
     *
     * @param id L'identifiant unique du secret à supprimer
     * @param user L'utilisateur authentifié effectuant la suppression
     */
    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user
    ) {
        vaultService.delete(id, user);
    }
}
