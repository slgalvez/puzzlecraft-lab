import type { GroupPosition } from "@/components/private/MessageBubble";
import { isPuzzleMessage } from "@/components/private/PuzzleMessageBubble";
import { isCallMessage } from "@/components/private/CallSystemMessage";

const GROUP_TIME_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

interface MinimalMessage {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

export interface MessageGroupInfo {
  groupPosition: GroupPosition;
  showTimestamp: boolean;
}

/** Returns true if the message is a system/special type that breaks grouping */
function isSystemMessage(body: string): boolean {
  return isPuzzleMessage(body) || isCallMessage(body);
}

/**
 * Compute visual grouping info for a list of messages.
 * Pure function — no side effects, no data mutation.
 */
export function computeMessageGroups(messages: MinimalMessage[]): MessageGroupInfo[] {
  const result: MessageGroupInfo[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    // System messages are always single/timestamped
    if (isSystemMessage(msg.body)) {
      result.push({ groupPosition: "single", showTimestamp: true });
      continue;
    }

    const sameSenderAsPrev =
      prev &&
      !isSystemMessage(prev.body) &&
      prev.sender_profile_id === msg.sender_profile_id &&
      Math.abs(new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < GROUP_TIME_THRESHOLD_MS;

    const sameSenderAsNext =
      next &&
      !isSystemMessage(next.body) &&
      next.sender_profile_id === msg.sender_profile_id &&
      Math.abs(new Date(next.created_at).getTime() - new Date(msg.created_at).getTime()) < GROUP_TIME_THRESHOLD_MS;

    let groupPosition: GroupPosition;
    if (sameSenderAsPrev && sameSenderAsNext) {
      groupPosition = "middle";
    } else if (!sameSenderAsPrev && sameSenderAsNext) {
      groupPosition = "top";
    } else if (sameSenderAsPrev && !sameSenderAsNext) {
      groupPosition = "bottom";
    } else {
      groupPosition = "single";
    }

    // Show timestamp on bottom/single of group, or if there's a time gap from prev
    const isLastInGroup = groupPosition === "bottom" || groupPosition === "single";
    const hasTimeGap =
      prev && Math.abs(new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > GROUP_TIME_THRESHOLD_MS;

    result.push({
      groupPosition,
      showTimestamp: isLastInGroup || !!hasTimeGap,
    });
  }

  return result;
}
