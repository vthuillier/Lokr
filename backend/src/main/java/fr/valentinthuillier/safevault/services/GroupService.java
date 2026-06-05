package fr.valentinthuillier.safevault.services;

import fr.valentinthuillier.safevault.dto.*;
import fr.valentinthuillier.safevault.models.Group;
import fr.valentinthuillier.safevault.models.GroupAccess;
import fr.valentinthuillier.safevault.models.GroupAccess.GroupRole;
import fr.valentinthuillier.safevault.models.User;
import fr.valentinthuillier.safevault.repositories.GroupAccessRepository;
import fr.valentinthuillier.safevault.repositories.GroupRepository;
import fr.valentinthuillier.safevault.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupAccessRepository groupAccessRepository;
    private final UserRepository userRepository;

    @Transactional
    public GroupResponse createGroup(User creator, CreateGroupRequest request) {
        Group group = Group.builder()
                .name(request.name())
                .build();
        group = groupRepository.save(group);

        GroupAccess access = GroupAccess.builder()
                .user(creator)
                .group(group)
                .encryptedGroupKey(request.encryptedGroupKey())
                .role(GroupRole.ADMIN)
                .build();
        groupAccessRepository.save(access);

        return new GroupResponse(group.getId(), group.getName(), access.getRole(), access.getEncryptedGroupKey());
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> findAll(User user) {
        return groupAccessRepository.findAllByUser(user).stream()
                .map(access -> new GroupResponse(
                        access.getGroup().getId(),
                        access.getGroup().getName(),
                        access.getRole(),
                        access.getEncryptedGroupKey()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public GroupResponse findById(User user, UUID groupId) {
        GroupAccess access = groupAccessRepository.findByGroupIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));

        return new GroupResponse(
                access.getGroup().getId(),
                access.getGroup().getName(),
                access.getRole(),
                access.getEncryptedGroupKey()
        );
    }

    @Transactional
    public void deleteGroup(User user, UUID groupId) {
        GroupAccess access = groupAccessRepository.findByGroupIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));

        if (access.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can delete the group");
        }

        Group group = access.getGroup();
        groupRepository.delete(group);
    }

    @Transactional(readOnly = true)
    public List<GroupMemberResponse> getMembers(User user, UUID groupId) {
        // Verify current user belongs to group
        groupAccessRepository.findByGroupIdAndUser(groupId, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));

        return groupAccessRepository.findAllByGroupId(groupId).stream()
                .map(access -> new GroupMemberResponse(
                        access.getUser().getId(),
                        access.getUser().getEmail(),
                        access.getRole(),
                        access.getEncryptedGroupKey()
                ))
                .toList();
    }

    @Transactional
    public void addMember(User currentUser, UUID groupId, AddMemberRequest request) {
        GroupAccess currentAccess = groupAccessRepository.findByGroupIdAndUser(groupId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));

        if (currentAccess.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can add members to the group");
        }

        User targetUser = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (groupAccessRepository.findByGroupIdAndUserId(groupId, targetUser.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already a member of the group");
        }

        GroupAccess newAccess = GroupAccess.builder()
                .user(targetUser)
                .group(currentAccess.getGroup())
                .encryptedGroupKey(request.encryptedGroupKey())
                .role(request.role())
                .build();
        groupAccessRepository.save(newAccess);
    }

    @Transactional
    public void updateMember(User currentUser, UUID groupId, UUID targetUserId, UpdateMemberRequest request) {
        GroupAccess currentAccess = groupAccessRepository.findByGroupIdAndUser(groupId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));

        if (currentAccess.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can update member roles");
        }

        GroupAccess targetAccess = groupAccessRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found in the group"));

        // Safeguard: Do not allow changing the last admin's role to something else
        if (targetAccess.getRole() == GroupRole.ADMIN && request.role() != GroupRole.ADMIN) {
            long adminCount = groupAccessRepository.findAllByGroupId(groupId).stream()
                    .filter(a -> a.getRole() == GroupRole.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change the role of the only admin in the group");
            }
        }

        targetAccess.setRole(request.role());
        groupAccessRepository.save(targetAccess);
    }

    @Transactional
    public void removeMember(User currentUser, UUID groupId, UUID targetUserId) {
        GroupAccess currentAccess = groupAccessRepository.findByGroupIdAndUser(groupId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to group"));

        boolean isSelfRemoving = currentUser.getId().equals(targetUserId);

        if (!isSelfRemoving && currentAccess.getRole() != GroupRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admins can remove members");
        }

        GroupAccess targetAccess = groupAccessRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found in the group"));

        // Safeguard: Check if we are removing the last admin
        if (targetAccess.getRole() == GroupRole.ADMIN) {
            long adminCount = groupAccessRepository.findAllByGroupId(groupId).stream()
                    .filter(a -> a.getRole() == GroupRole.ADMIN)
                    .count();
            
            if (adminCount <= 1) {
                // If there are other members left, we can't leave the group adminless
                long totalCount = groupAccessRepository.findAllByGroupId(groupId).size();
                if (totalCount > 1) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the only admin when other members are in the group. Designate another admin first.");
                } else {
                    // If it is the last person in the group, we can delete the group
                    groupRepository.delete(currentAccess.getGroup());
                    return;
                }
            }
        }

        groupAccessRepository.delete(targetAccess);
    }

}
