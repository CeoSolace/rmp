import { Client, Databases, Permission, Role } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "rampchat_main";
const profilesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || "rc_profiles";
const conversationsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_CONVERSATIONS_COLLECTION_ID || "rc_conversations";
const messagesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID || "rc_messages";

if (!endpoint) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is missing");
}

if (!projectId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is missing");
}

if (!apiKey) {
  throw new Error("APPWRITE_API_KEY is missing");
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

type ExistingCollection = {
  $id: string;
  name: string;
};

type ExistingAttribute = {
  key: string;
  status?: string;
};

type ExistingIndex = {
  key: string;
  status?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAlreadyExistsError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: string }).message || "").toLowerCase()
      : "";

  return (
    message.includes("already exists") ||
    message.includes("already been taken") ||
    message.includes("duplicate") ||
    message.includes("conflict")
  );
}

async function ensureDatabase(databaseId: string, name: string) {
  try {
    await databases.get({ databaseId });
    console.log(`✓ Database exists: ${databaseId}`);
  } catch {
    console.log(`Creating database: ${databaseId}`);
    await databases.create({
      databaseId,
      name,
    });
    console.log(`✓ Created database: ${databaseId}`);
  }
}

async function collectionExists(databaseId: string, collectionId: string) {
  try {
    await databases.getCollection({ databaseId, collectionId });
    return true;
  } catch {
    return false;
  }
}

async function ensureCollection(
  databaseId: string,
  collectionId: string,
  name: string
) {
  if (await collectionExists(databaseId, collectionId)) {
    console.log(`✓ Collection exists: ${collectionId}`);
    return;
  }

  console.log(`Creating collection: ${collectionId}`);
  await databases.createCollection({
    databaseId,
    collectionId,
    name,
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    documentSecurity: true,
    enabled: true,
  });
  console.log(`✓ Created collection: ${collectionId}`);
}

async function listAttributesSafe(databaseId: string, collectionId: string) {
  try {
    const result = await databases.listAttributes({
      databaseId,
      collectionId,
    });
    return result.attributes as ExistingAttribute[];
  } catch {
    return [];
  }
}

async function listIndexesSafe(databaseId: string, collectionId: string) {
  try {
    const result = await databases.listIndexes({
      databaseId,
      collectionId,
    });
    return result.indexes as ExistingIndex[];
  } catch {
    return [];
  }
}

async function hasAttribute(databaseId: string, collectionId: string, key: string) {
  const attributes = await listAttributesSafe(databaseId, collectionId);
  return attributes.some((attribute) => attribute.key === key);
}

async function hasIndex(databaseId: string, collectionId: string, key: string) {
  const indexes = await listIndexesSafe(databaseId, collectionId);
  return indexes.some((index) => index.key === key);
}

async function waitForAttributes(databaseId: string, collectionId: string, keys: string[]) {
  const timeoutMs = 120000;
  const intervalMs = 1500;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const attributes = await listAttributesSafe(databaseId, collectionId);
    const ready = keys.every((key) =>
      attributes.some(
        (attribute) =>
          attribute.key === key &&
          (!attribute.status || attribute.status === "available")
      )
    );

    if (ready) {
      return;
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for attributes on collection "${collectionId}": ${keys.join(", ")}`
  );
}

async function createStringAttributeIfMissing(
  databaseId: string,
  collectionId: string,
  key: string,
  size: number,
  required: boolean,
  defaultValue?: string
) {
  if (await hasAttribute(databaseId, collectionId, key)) {
    console.log(`✓ Attribute exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating string attribute: ${collectionId}.${key}`);
  try {
    await databases.createStringAttribute({
      databaseId,
      collectionId,
      key,
      size,
      required,
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
      array: false,
      encrypt: false,
    });
    console.log(`✓ Created attribute: ${collectionId}.${key}`);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      console.log(`✓ Attribute already exists: ${collectionId}.${key}`);
      return;
    }
    throw error;
  }
}

async function createEmailAttributeIfMissing(
  databaseId: string,
  collectionId: string,
  key: string,
  required: boolean,
  defaultValue?: string
) {
  if (await hasAttribute(databaseId, collectionId, key)) {
    console.log(`✓ Attribute exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating email attribute: ${collectionId}.${key}`);
  try {
    await databases.createEmailAttribute({
      databaseId,
      collectionId,
      key,
      required,
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
      array: false,
    });
    console.log(`✓ Created attribute: ${collectionId}.${key}`);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      console.log(`✓ Attribute already exists: ${collectionId}.${key}`);
      return;
    }
    throw error;
  }
}

async function createDatetimeAttributeIfMissing(
  databaseId: string,
  collectionId: string,
  key: string,
  required: boolean
) {
  if (await hasAttribute(databaseId, collectionId, key)) {
    console.log(`✓ Attribute exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating datetime attribute: ${collectionId}.${key}`);
  try {
    await databases.createDatetimeAttribute({
      databaseId,
      collectionId,
      key,
      required,
      array: false,
    });
    console.log(`✓ Created attribute: ${collectionId}.${key}`);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      console.log(`✓ Attribute already exists: ${collectionId}.${key}`);
      return;
    }
    throw error;
  }
}

async function createIndexIfMissing(
  databaseId: string,
  collectionId: string,
  key: string,
  type: "key" | "fulltext" | "unique",
  attributes: string[],
  orders?: ("ASC" | "DESC")[]
) {
  if (await hasIndex(databaseId, collectionId, key)) {
    console.log(`✓ Index exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating index: ${collectionId}.${key}`);
  try {
    await databases.createIndex({
      databaseId,
      collectionId,
      key,
      type,
      attributes,
      ...(orders ? { orders } : {}),
    });
    console.log(`✓ Created index: ${collectionId}.${key}`);
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      console.log(`✓ Index already exists: ${collectionId}.${key}`);
      return;
    }
    throw error;
  }
}

async function setupProfiles() {
  await ensureCollection(databaseId, profilesCollectionId, "Profiles");

  await createStringAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "userId",
    50,
    true
  );
  await createEmailAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "email",
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "username",
    32,
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "usernameLower",
    32,
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "displayName",
    64,
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "bio",
    1000,
    false,
    ""
  );
  await createStringAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "avatarUrl",
    2000,
    false,
    ""
  );
  await createDatetimeAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "createdAt",
    true
  );
  await createDatetimeAttributeIfMissing(
    databaseId,
    profilesCollectionId,
    "updatedAt",
    true
  );

  await waitForAttributes(databaseId, profilesCollectionId, [
    "userId",
    "email",
    "username",
    "usernameLower",
    "displayName",
    "bio",
    "avatarUrl",
    "createdAt",
    "updatedAt",
  ]);

  console.log(
    `✓ Attributes ready for ${profilesCollectionId}: userId, email, username, usernameLower, displayName, bio, avatarUrl, createdAt, updatedAt`
  );

  await createIndexIfMissing(
    databaseId,
    profilesCollectionId,
    "userId_unique",
    "unique",
    ["userId"]
  );
  await createIndexIfMissing(
    databaseId,
    profilesCollectionId,
    "email_unique",
    "unique",
    ["email"]
  );
  await createIndexIfMissing(
    databaseId,
    profilesCollectionId,
    "username_unique",
    "unique",
    ["username"]
  );
  await createIndexIfMissing(
    databaseId,
    profilesCollectionId,
    "usernameLower_unique",
    "unique",
    ["usernameLower"]
  );
}

async function setupConversations() {
  await ensureCollection(databaseId, conversationsCollectionId, "Conversations");

  await createStringAttributeIfMissing(
    databaseId,
    conversationsCollectionId,
    "type",
    20,
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    conversationsCollectionId,
    "participantIds",
    1000,
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    conversationsCollectionId,
    "participantKey",
    255,
    true
  );
  await createDatetimeAttributeIfMissing(
    databaseId,
    conversationsCollectionId,
    "createdAt",
    true
  );
  await createDatetimeAttributeIfMissing(
    databaseId,
    conversationsCollectionId,
    "updatedAt",
    true
  );

  await waitForAttributes(databaseId, conversationsCollectionId, [
    "type",
    "participantIds",
    "participantKey",
    "createdAt",
    "updatedAt",
  ]);

  console.log(
    `✓ Attributes ready for ${conversationsCollectionId}: type, participantIds, participantKey, createdAt, updatedAt`
  );

  await createIndexIfMissing(
    databaseId,
    conversationsCollectionId,
    "participantKey_unique",
    "unique",
    ["participantKey"]
  );
  await createIndexIfMissing(
    databaseId,
    conversationsCollectionId,
    "updatedAt_key",
    "key",
    ["updatedAt"],
    ["DESC"]
  );
}

async function setupMessages() {
  await ensureCollection(databaseId, messagesCollectionId, "Messages");

  await createStringAttributeIfMissing(
    databaseId,
    messagesCollectionId,
    "conversationId",
    50,
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    messagesCollectionId,
    "senderId",
    50,
    true
  );
  await createStringAttributeIfMissing(
    databaseId,
    messagesCollectionId,
    "body",
    5000,
    true
  );
  await createDatetimeAttributeIfMissing(
    databaseId,
    messagesCollectionId,
    "createdAt",
    true
  );
  await createDatetimeAttributeIfMissing(
    databaseId,
    messagesCollectionId,
    "updatedAt",
    true
  );

  await waitForAttributes(databaseId, messagesCollectionId, [
    "conversationId",
    "senderId",
    "body",
    "createdAt",
    "updatedAt",
  ]);

  console.log(
    `✓ Attributes ready for ${messagesCollectionId}: conversationId, senderId, body, createdAt, updatedAt`
  );

  await createIndexIfMissing(
    databaseId,
    messagesCollectionId,
    "conversationId_key",
    "key",
    ["conversationId"]
  );
  await createIndexIfMissing(
    databaseId,
    messagesCollectionId,
    "senderId_key",
    "key",
    ["senderId"]
  );
  await createIndexIfMissing(
    databaseId,
    messagesCollectionId,
    "conversation_created_key",
    "key",
    ["conversationId", "createdAt"],
    ["ASC", "ASC"]
  );
}

async function main() {
  console.log("Starting Appwrite setup...");

  await ensureDatabase(databaseId, "RampChat Main");

  await setupProfiles();
  await setupConversations();
  await setupMessages();

  console.log("");
  console.log("✅ Appwrite setup complete.");
  console.log(`Database: ${databaseId}`);
  console.log(`Profiles: ${profilesCollectionId}`);
  console.log(`Conversations: ${conversationsCollectionId}`);
  console.log(`Messages: ${messagesCollectionId}`);
}

main().catch((error) => {
  console.error("❌ Appwrite setup failed");
  console.error(error);
  process.exit(1);
});
