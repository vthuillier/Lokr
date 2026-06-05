package fr.valentinthuillier.safevault.controllers;

import fr.valentinthuillier.safevault.dto.*;
import fr.valentinthuillier.safevault.models.User;
import fr.valentinthuillier.safevault.services.GroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@AuthenticationPrincipal User user,
                                 @Valid @RequestBody CreateGroupRequest request) {
        return groupService.createGroup(user, request);
    }

    @GetMapping
    public List<GroupResponse> getAll(@AuthenticationPrincipal User user) {
        return groupService.findAll(user);
    }

    @GetMapping("/{id}")
    public GroupResponse getById(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return groupService.findById(user, id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        groupService.deleteGroup(user, id);
    }

    @GetMapping("/{groupId}/members")
    public List<GroupMemberResponse> getMembers(@AuthenticationPrincipal User user,
                                                @PathVariable UUID groupId) {
        return groupService.getMembers(user, groupId);
    }

    @PostMapping("/{groupId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public void addMember(@AuthenticationPrincipal User user,
                          @PathVariable UUID groupId,
                          @Valid @RequestBody AddMemberRequest request) {
        groupService.addMember(user, groupId, request);
    }

    @PutMapping("/{groupId}/members/{userId}")
    public void updateMember(@AuthenticationPrincipal User user,
                             @PathVariable UUID groupId,
                             @PathVariable UUID userId,
                             @Valid @RequestBody UpdateMemberRequest request) {
        groupService.updateMember(user, groupId, userId, request);
    }

    @DeleteMapping("/{groupId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@AuthenticationPrincipal User user,
                             @PathVariable UUID groupId,
                             @PathVariable UUID userId) {
        groupService.removeMember(user, groupId, userId);
    }

}
