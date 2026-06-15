package fr.valentinthuillier.lokr.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import fr.valentinthuillier.lokr.models.Folder;
import fr.valentinthuillier.lokr.models.User;

public interface FolderRepository extends JpaRepository<Folder, UUID> {
    List<Folder> findAllByUserOrderByCreatedAtAsc(User user);

    boolean existsByIdAndUser(UUID id, User user);
}
