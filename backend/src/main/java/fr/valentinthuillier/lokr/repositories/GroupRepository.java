package fr.valentinthuillier.lokr.repositories;

import fr.valentinthuillier.lokr.models.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

/**
 * Référentiel de données (Repository) pour l'accès aux groupes (Group) en base de données.
 */
public interface GroupRepository extends JpaRepository<Group, UUID> {
}
