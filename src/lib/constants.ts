export const RESERVED_USERNAMES = [
  "admin",
  "support",
  "system",
  "owner",
  "root",
  "api",
  "rampchat",
] as const;

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || "rampchat_main";
export const USERS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  process.env.APPWRITE_USERS_COLLECTION_ID ||
  "rc_users";

export const PROFILES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID ||
  process.env.APPWRITE_PROFILES_COLLECTION_ID ||
  "rc_profiles";

export const CONVERSATIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CONVERSATIONS_COLLECTION_ID ||
  process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID ||
  "rc_conversations";

export const MESSAGES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID ||
  process.env.APPWRITE_MESSAGES_COLLECTION_ID ||
  "rc_messages";
