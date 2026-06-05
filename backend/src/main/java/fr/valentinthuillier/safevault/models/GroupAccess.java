package fr.valentinthuillier.safevault.models;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "group_access")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupAccess {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @Column(name = "encrypted_group_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedGroupKey;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private GroupRole role;

    public enum GroupRole {
        ADMIN,
        MEMBER,
        VIEWER
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (role == null) {
            role = GroupRole.VIEWER;
        }
    }

}
