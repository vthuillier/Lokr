package fr.valentinthuillier.safevault.repositories;

import fr.valentinthuillier.safevault.models.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {
}
