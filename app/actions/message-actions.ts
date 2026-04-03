"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  canReadCommunityProfile,
  canUseCommunityProfileFeature,
  COMMUNITY_PROFILE_BLOCKED_MESSAGE,
  COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
  getCommunityProfileRestrictionMessage,
} from "@/lib/community-profile";
import { classifyContentLevel, findBlockedKeyword } from "@/lib/moderation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { VerificationState } from "@/types";

const directMessageTargetSchema = z.string().uuid();

const directMessageSendSchema = z
  .object({
    targetUserId: z.string().uuid().optional(),
    threadId: z.string().uuid().optional(),
    content: z.string().trim().min(1).max(1000),
  })
  .superRefine((value, context) => {
    if (!value.targetUserId && !value.threadId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["threadId"],
        message: "쪽지를 보낼 대상을 다시 선택해주세요.",
      });
    }
  });

type CurrentMessageUserRow = {
  id: string;
  email: string | null;
  school_id: string | null;
  nickname: string | null;
  name: string | null;
  verification_state: VerificationState | null;
  student_verification_status: string | null;
  verified: boolean;
};

type MessageProfileRow = {
  id: string;
  display_name: string | null;
  profile_visibility: "university_only" | "same_school_only";
};

type DirectMessageThreadRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

type DirectMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

function toCommunityAccessUser(user: CurrentMessageUserRow) {
  return {
    id: user.id,
    email: user.email ?? undefined,
    schoolId: user.school_id ?? undefined,
    verificationState: user.verification_state ?? undefined,
    studentVerificationStatus: user.student_verification_status ?? undefined,
    verified: user.verified,
  };
}

function getProfileDisplayName(
  user: Pick<CurrentMessageUserRow, "nickname" | "name">,
  profile?: Pick<MessageProfileRow, "display_name"> | null,
) {
  return profile?.display_name ?? user.nickname ?? user.name ?? "익명";
}

async function requireDirectMessageUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const admin = createAdminSupabaseClient();
  const { data: currentUser, error: currentUserError } = await admin
    .from("users")
    .select(
      "id, email, school_id, nickname, name, verification_state, student_verification_status, verified",
    )
    .eq("id", user.id)
    .single();

  if (currentUserError || !currentUser) {
    throw new Error("사용자 정보를 확인할 수 없습니다.");
  }

  if (
    !canUseCommunityProfileFeature({
      verificationState: currentUser.verification_state ?? undefined,
      studentVerificationStatus: currentUser.student_verification_status ?? undefined,
      verified: Boolean(currentUser.verified),
      email: currentUser.email ?? undefined,
    })
  ) {
    throw new Error(COMMUNITY_PROFILE_RESTRICTION_MESSAGE);
  }

  return {
    admin,
    currentUser: currentUser as CurrentMessageUserRow,
  };
}

async function getUserRow(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("users")
    .select(
      "id, email, school_id, nickname, name, verification_state, student_verification_status, verified",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as CurrentMessageUserRow | null;
}

async function getMessageProfileRow(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, profile_visibility")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as MessageProfileRow | null;
}

async function getSchoolNameMap(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  schoolIds: string[],
) {
  if (schoolIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await admin
    .from("schools")
    .select("id, name")
    .in("id", schoolIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? [])
      .filter((item) => item.id && item.name)
      .map((item) => [String(item.id), String(item.name)]),
  );
}

async function hasProfileBlockRelation(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  targetUserId: string,
) {
  const { data, error } = await admin
    .from("profile_blocks")
    .select("id")
    .or(
      `and(user_id.eq.${userId},blocked_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},blocked_user_id.eq.${userId})`,
    )
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}

async function assertDirectMessageAccess(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  viewer: CurrentMessageUserRow,
  targetUserId: string,
) {
  if (targetUserId === viewer.id) {
    throw new Error("본인에게는 쪽지를 보낼 수 없습니다.");
  }

  const targetUser = await getUserRow(admin, targetUserId);
  if (!targetUser) {
    throw new Error("프로필을 찾을 수 없습니다.");
  }

  if (
    !canUseCommunityProfileFeature({
      verificationState: targetUser.verification_state ?? undefined,
      studentVerificationStatus: targetUser.student_verification_status ?? undefined,
      verified: Boolean(targetUser.verified),
      email: targetUser.email ?? undefined,
    })
  ) {
    throw new Error("학생 인증을 완료한 사용자에게만 쪽지를 보낼 수 있습니다.");
  }

  const targetProfile = await getMessageProfileRow(admin, targetUserId);
  const blocked = await hasProfileBlockRelation(admin, viewer.id, targetUserId);
  const canRead = canReadCommunityProfile(
    toCommunityAccessUser(viewer),
    {
      ...toCommunityAccessUser(targetUser),
      profileVisibility: targetProfile?.profile_visibility ?? "university_only",
    },
    blocked,
  );

  if (!canRead) {
    throw new Error(
      blocked
        ? COMMUNITY_PROFILE_BLOCKED_MESSAGE
        : getCommunityProfileRestrictionMessage(
            toCommunityAccessUser(viewer),
            {
              ...toCommunityAccessUser(targetUser),
              profileVisibility: targetProfile?.profile_visibility ?? "university_only",
            },
            false,
          ) ?? COMMUNITY_PROFILE_RESTRICTION_MESSAGE,
    );
  }

  return {
    targetUser,
    targetProfile,
  };
}

async function findDirectMessageThread(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  targetUserId: string,
) {
  const { data, error } = await admin
    .from("direct_message_threads")
    .select("id, user_a_id, user_b_id, created_at, updated_at, last_message_at")
    .or(
      `and(user_a_id.eq.${userId},user_b_id.eq.${targetUserId}),and(user_a_id.eq.${targetUserId},user_b_id.eq.${userId})`,
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as DirectMessageThreadRow | null;
}

async function requireDirectMessageThread(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  currentUser: CurrentMessageUserRow,
  threadId: string,
) {
  const { data, error } = await admin
    .from("direct_message_threads")
    .select("id, user_a_id, user_b_id, created_at, updated_at, last_message_at")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const thread = (data ?? null) as DirectMessageThreadRow | null;
  if (!thread) {
    throw new Error("쪽지 대화를 찾을 수 없습니다.");
  }

  if (thread.user_a_id !== currentUser.id && thread.user_b_id !== currentUser.id) {
    throw new Error("이 쪽지 대화에 접근할 수 없습니다.");
  }

  const targetUserId = thread.user_a_id === currentUser.id ? thread.user_b_id : thread.user_a_id;
  const { targetUser, targetProfile } = await assertDirectMessageAccess(admin, currentUser, targetUserId);

  return {
    thread,
    targetUser,
    targetProfile,
  };
}

function sanitizeDirectMessagePreview(content: string) {
  return content.trim().replace(/\s+/g, " ").slice(0, 120);
}

export async function getDirectMessageTarget(targetUserId: string) {
  const parsedTargetUserId = directMessageTargetSchema.parse(targetUserId);
  const { admin, currentUser } = await requireDirectMessageUser();
  const { targetUser, targetProfile } = await assertDirectMessageAccess(admin, currentUser, parsedTargetUserId);

  const schoolNameMap = await getSchoolNameMap(
    admin,
    targetUser.school_id ? [targetUser.school_id] : [],
  );

  return {
    userId: targetUser.id,
    displayName: getProfileDisplayName(targetUser, targetProfile),
    schoolName: targetUser.school_id ? schoolNameMap.get(targetUser.school_id) : undefined,
  };
}

export async function getDirectMessageThreads() {
  const { admin, currentUser } = await requireDirectMessageUser();

  const { data, error } = await admin
    .from("direct_message_threads")
    .select("id, user_a_id, user_b_id, created_at, updated_at, last_message_at")
    .or(`user_a_id.eq.${currentUser.id},user_b_id.eq.${currentUser.id}`)
    .order("last_message_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(error.message);
  }

  const threads = (data ?? []) as DirectMessageThreadRow[];
  if (threads.length === 0) {
    return [];
  }

  const otherUserIds = Array.from(
    new Set(
      threads.map((thread) => (thread.user_a_id === currentUser.id ? thread.user_b_id : thread.user_a_id)),
    ),
  );

  const [{ data: userRows, error: userError }, { data: profileRows, error: profileError }, { data: messageRows, error: messageError }] =
    await Promise.all([
      admin
        .from("users")
        .select("id, school_id, nickname, name")
        .in("id", otherUserIds),
      admin
        .from("profiles")
        .select("id, display_name")
        .in("id", otherUserIds),
      admin
        .from("direct_messages")
        .select("id, thread_id, sender_id, content, created_at, read_at")
        .in("thread_id", threads.map((thread) => thread.id))
        .order("created_at", { ascending: false })
        .limit(400),
    ]);

  if (userError) {
    throw new Error(userError.message);
  }

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (messageError) {
    throw new Error(messageError.message);
  }

  const schoolNameMap = await getSchoolNameMap(
    admin,
    Array.from(new Set((userRows ?? []).map((item) => item.school_id).filter(Boolean))),
  );

  const userMap = new Map(
    (userRows ?? []).map((item) => [String(item.id), item]),
  );
  const profileMap = new Map(
    (profileRows ?? []).map((item) => [String(item.id), item]),
  );

  const messagesByThread = new Map<string, DirectMessageRow[]>();
  for (const row of (messageRows ?? []) as DirectMessageRow[]) {
    const current = messagesByThread.get(row.thread_id) ?? [];
    current.push(row);
    messagesByThread.set(row.thread_id, current);
  }

  return threads.map((thread) => {
    const otherUserId = thread.user_a_id === currentUser.id ? thread.user_b_id : thread.user_a_id;
    const otherUser = userMap.get(otherUserId);
    const otherProfile = profileMap.get(otherUserId);
    const rows = messagesByThread.get(thread.id) ?? [];
    const latestMessage = rows[0];
    const unreadCount = rows.filter((row) => row.sender_id !== currentUser.id && !row.read_at).length;

    return {
      id: thread.id,
      otherUserId,
      displayName: getProfileDisplayName(
        {
          nickname: otherUser?.nickname ?? null,
          name: otherUser?.name ?? null,
        },
        otherProfile ? { display_name: otherProfile.display_name } : null,
      ),
      schoolName:
        otherUser?.school_id ? schoolNameMap.get(String(otherUser.school_id)) : undefined,
      preview: latestMessage
        ? `${latestMessage.sender_id === currentUser.id ? "나" : "상대"} · ${sanitizeDirectMessagePreview(latestMessage.content)}`
        : "쪽지를 시작해보세요.",
      unread: unreadCount > 0,
      unreadCount,
      lastMessageAt: latestMessage?.created_at ?? thread.last_message_at,
    };
  });
}

export async function getDirectMessageThread(threadId: string) {
  const parsedThreadId = directMessageTargetSchema.parse(threadId);
  const { admin, currentUser } = await requireDirectMessageUser();
  const { thread, targetUser, targetProfile } = await requireDirectMessageThread(
    admin,
    currentUser,
    parsedThreadId,
  );

  const { data: messageRows, error: messageError } = await admin
    .from("direct_messages")
    .select("id, thread_id, sender_id, content, created_at, read_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (messageError) {
    throw new Error(messageError.message);
  }

  const nowIso = new Date().toISOString();
  const { error: readError } = await admin
    .from("direct_messages")
    .update({ read_at: nowIso })
    .eq("thread_id", thread.id)
    .neq("sender_id", currentUser.id)
    .is("read_at", null);

  if (readError) {
    throw new Error(readError.message);
  }

  const schoolNameMap = await getSchoolNameMap(
    admin,
    targetUser.school_id ? [targetUser.school_id] : [],
  );

  revalidatePath("/messages");

  return {
    id: thread.id,
    otherUserId: targetUser.id,
    displayName: getProfileDisplayName(targetUser, targetProfile),
    schoolName: targetUser.school_id ? schoolNameMap.get(targetUser.school_id) : undefined,
    messages: ((messageRows ?? []) as DirectMessageRow[]).map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      content: row.content,
      createdAt: row.created_at,
      readAt: row.read_at ?? undefined,
      isMine: row.sender_id === currentUser.id,
    })),
  };
}

export async function sendDirectMessage(input: z.input<typeof directMessageSendSchema>) {
  const values = directMessageSendSchema.parse(input);
  const { admin, currentUser } = await requireDirectMessageUser();

  const keyword = findBlockedKeyword(values.content);
  if (keyword) {
    throw new Error(`부적절한 표현(${keyword})이 포함되어 있습니다.`);
  }

  if (classifyContentLevel(values.content) === "obscene") {
    throw new Error("노골적인 성적 표현은 쪽지에 사용할 수 없습니다.");
  }

  let thread: DirectMessageThreadRow | null = null;
  let targetUserId = values.targetUserId ?? null;

  if (values.threadId) {
    const detail = await requireDirectMessageThread(admin, currentUser, values.threadId);
    thread = detail.thread;
    targetUserId = detail.targetUser.id;
  } else if (targetUserId) {
    await assertDirectMessageAccess(admin, currentUser, targetUserId);
    thread = await findDirectMessageThread(admin, currentUser.id, targetUserId);
  }

  if (!targetUserId) {
    throw new Error("쪽지를 보낼 대상을 다시 선택해주세요.");
  }

  const nowIso = new Date().toISOString();

  if (!thread) {
    const { data, error } = await admin
      .from("direct_message_threads")
      .insert({
        user_a_id: currentUser.id,
        user_b_id: targetUserId,
        created_at: nowIso,
        updated_at: nowIso,
        last_message_at: nowIso,
      })
      .select("id, user_a_id, user_b_id, created_at, updated_at, last_message_at")
      .single();

    if (error) {
      if (error.code !== "23505") {
        throw new Error(error.message);
      }

      thread = await findDirectMessageThread(admin, currentUser.id, targetUserId);
    } else {
      thread = data as DirectMessageThreadRow;
    }
  }

  if (!thread) {
    throw new Error("쪽지 대화를 시작하지 못했습니다.");
  }

  const { error: messageError } = await admin
    .from("direct_messages")
    .insert({
      thread_id: thread.id,
      sender_id: currentUser.id,
      content: values.content,
      created_at: nowIso,
    });

  if (messageError) {
    throw new Error(messageError.message);
  }

  const { error: threadUpdateError } = await admin
    .from("direct_message_threads")
    .update({
      updated_at: nowIso,
      last_message_at: nowIso,
    })
    .eq("id", thread.id);

  if (threadUpdateError) {
    throw new Error(threadUpdateError.message);
  }

  revalidatePath("/messages");
  revalidatePath(`/profile/${targetUserId}`);

  return {
    threadId: thread.id,
  };
}
