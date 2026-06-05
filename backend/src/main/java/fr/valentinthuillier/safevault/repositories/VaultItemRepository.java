package fr.valentinthuillier.safevault.repositories;

import fr.valentinthuillier.safevault.models.VaultItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface VaultItemRepository extends JpaRepository<VaultItem, UUID> {

    List<VaultItem> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    @Query("SELECT vi FROM VaultItem vi WHERE (vi.user.id = :userId AND vi.group IS NULL) OR (vi.group.id IN (SELECT ga.group.id FROM GroupAccess ga WHERE ga.user.id = :userId)) ORDER BY vi.createdAt DESC")
    List<VaultItem> findAllByUserIdOrGroupAccessOrderByCreatedAtDesc(@Param("userId") UUID userId);

}
