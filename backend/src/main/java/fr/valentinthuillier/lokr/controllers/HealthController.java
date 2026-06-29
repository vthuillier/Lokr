package fr.valentinthuillier.lokr.controllers;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Contrôleur de vérification de l'état de santé du service backend.
 */
@RestController
public class HealthController {

    /**
     * Endpoint pour vérifier que le service backend fonctionne correctement.
     *
     * @return Une map contenant le statut "status" = "OK"
     */
    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "OK");
    }

}
