import { ID, Query } from "appwrite";
import { databases } from "@/lib/appwrite/client";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const profilesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;
const conversationsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_CONVERSATIONS_COLLECTION_ID!;

type ProfileDoc = {
  $id: string;
  userId: string;
  username: string;
  usernameLower: string;
  displayName?: string;
};

type ConversationDoc = {
  $id: string;
  type: "direct" | "group";
  participantIds: string[];
  participantKey: string;
  createdAt: string;
  updatedAt: string;
};

export function normalizeUsername(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

export async function findProfileByUsername(username: string) {
  const usernameLower = normalizeUsername(username);

  const result = await databases.listDocuments<ProfileDoc>(
    databaseId,
    profilesCollectionId,
    [Query.equal("usernameLower", usernameLower), Query.limit(1)]
  );

  return result.documents[0] ?? null;
}

export function buildDirectParticipantKey(userA: string, userB: string) {
  return [userA, userB].sort().join("__");
}

export async function createOrGetDirectConversation(
  currentUserId: string,
  targetUserId: string
) {
  if (currentUserId === targetUserId) {
    throw new Error("You cannot message yourself.");
  }

  const participantKey = buildDirectParticipantKey(currentUserId, targetUserId);

  const existing = await databases.listDocuments<ConversationDoc>(
    databaseId,
    conversationsCollectionId,
    [Query.equal("participantKey", participantKey), Query.limit(1)]
  );

  if (existing.documents.length > 0) {
    return existing.documents[0];
  }

  const now = new Date().toISOString();

  const created = await databases.createDocument<ConversationDoc>(
    databaseId,
    conversationsCollectionId,
    ID.unique(),
    {
      type: "direct",
      participantIds: [currentUserId, targetUserId],
      participantKey,
      createdAt: now,
      updatedAt: now,
    }
  );

  return created;
}
