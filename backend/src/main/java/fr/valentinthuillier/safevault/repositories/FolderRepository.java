package fr.valentinthuillier.safevault.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import fr.valentinthuillier.safevault.models.Folder;
import fr.valentinthuillier.safevault.models.User;

public interface FolderRepository extends JpaRepository<Folder, UUID> {
    List<Folder> findAllByUserOrderByCreatedAtAsc(User user);

    boolean existsByIdAndUser(UUID id, User user);
}