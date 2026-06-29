package fr.valentinthuillier.lokr.repositories;

import fr.valentinthuillier.lokr.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Référentiel de données (Repository) pour l'accès aux utilisateurs (User) en base de données.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Recherche un utilisateur par son adresse email.
     *
     * @param email L'adresse email de l'utilisateur
     * @return Un Optional contenant l'utilisateur s'il est trouvé
     */
    Optional<User> findByEmail(String email);

    /**
     * Vérifie si un utilisateur existe avec l'adresse email spécifiée.
     *
     * @param email L'adresse email à vérifier
     * @return true si l'email est déjà utilisé, false sinon
     */
    boolean existsByEmail(String email);

}
