package fr.valentinthuillier.safevault.repositories;

import fr.valentinthuillier.safevault.models.Group;
import fr.valentinthuillier.safevault.models.GroupAccess;
import fr.valentinthuillier.safevault.models.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupAccessRepository extends JpaRepository<GroupAccess, UUID> {
    List<GroupAccess> findAllByUser(User user);
    List<GroupAccess> findAllByGroupId(UUID groupId);
    Optional<GroupAccess> findByGroupIdAndUserId(UUID groupId, UUID userId);
    Optional<GroupAccess> findByGroupIdAndUser(UUID groupId, User user);
    boolean existsByGroupIdAndUserIdAndRole(UUID groupId, UUID userId, GroupAccess.GroupRole role);
}
