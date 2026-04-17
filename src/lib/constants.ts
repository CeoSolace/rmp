// Reserved usernames which cannot be chosen by users. Prevents
// impersonation of system accounts and other special identifiers.
export const RESERVED_USERNAMES: string[] = [
  'admin',
  'support',
  'system',
  'owner',
  'root',
  'api',
  'rampchat',
];

// Appwrite database and collection identifiers. These values should
// correspond to the environment variables configured for your Appwrite
// project. Keeping these values in one place centralises your
// configuration and makes it easier to update your schema later.
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID as string;
export const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID as string;
export const PROFILES_COLLECTION_ID = process.env.APPWRITE_PROFILES_COLLECTION_ID as string;
export const CONVERSATIONS_COLLECTION_ID = process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID as string;
export const MESSAGES_COLLECTION_ID = process.env.APPWRITE_MESSAGES_COLLECTION_ID as string;