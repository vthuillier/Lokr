package fr.valentinthuillier.lokr.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record RemoveMemberRequest(
    Map<UUID, String> newGroupKeys,
    List<ReencryptedItemRequest> reencryptedItems
) {}
