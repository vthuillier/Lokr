package fr.valentinthuillier.lokr.services;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

/**
 * Service gérant la génération et la validation des jetons de sécurité JWT.
 */
@Service
public class JwtService {

    /** Secret de signature du jeton, configuré via les propriétés de l'application. */
    @Value("${security.jwt.secret}")
    private String secret;

    /** Durée d'expiration du jeton en millisecondes. */
    @Value("${security.jwt.expiration}")
    private long expiration;

    /**
     * Génère la clé de signature HMAC à partir du secret configuré.
     *
     * @return La clé secrète de signature
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    /**
     * Génère un jeton JWT contenant l'identifiant de l'utilisateur comme sujet.
     *
     * @param userId L'identifiant unique de l'utilisateur
     * @return Le jeton JWT généré
     */
    public String generateToken(UUID userId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extrait l'identifiant utilisateur (sujet) d'un jeton JWT donné après l'avoir validé.
     *
     * @param token Le jeton JWT à valider
     * @return L'identifiant unique de l'utilisateur (UUID) sous forme d'objet
     * @throws ExpiredJwtException Si le jeton JWT a expiré
     */
    public UUID extractUserId(String token) throws ExpiredJwtException {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return UUID.fromString(claims.getSubject());
    }

}
