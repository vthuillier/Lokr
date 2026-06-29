package fr.valentinthuillier.lokr.dto;

/**
 * Réponse contenant la clé publique asymétrique d'un utilisateur.
 *
 * @param publicKey La clé publique encodée en String
 */
public record PublicKeyResponse(String publicKey) {}
