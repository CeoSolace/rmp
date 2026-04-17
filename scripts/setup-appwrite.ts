import { Client, Databases, Permission, Role, IndexType } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

const databaseId = process.env.APPWRITE_DATABASE_ID || "rampchat_main";
const profilesId = process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles";
const conversationsId =
  process.env.APPWRITE_CONVERSATIONS_COLLECTION_ID || "conversations";
const messagesId = process.env.APPWRITE_MESSAGES_COLLECTION_ID || "messages";

if (!endpoint) throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is missing");
if (!projectId) throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is missing");
if (!apiKey) throw new Error("APPWRITE_API_KEY is missing");

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isNotFoundError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "number"
  ) {
    return (error as { code: number }).code === 404;
  }

  return false;
}

async function ensureDatabase() {
  try {
    await databases.get(databaseId);
    console.log(`✓ Database exists: ${databaseId}`);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;

    console.log(`Creating database: ${databaseId}`);
    await databases.create(databaseId, "RampChat Main");
    console.log(`✓ Created database: ${databaseId}`);
  }
}

async function ensureCollection(
  collectionId: string,
  name: string,
  documentSecurity = false
) {
  try {
    await databases.getCollection(databaseId, collectionId);
    console.log(`✓ Collection exists: ${collectionId}`);
  } catch (error) {
    if (!isNotFoundError(error)) throw error;

    console.log(`Creating collection: ${collectionId}`);
    await databases.createCollection(
      databaseId,
      collectionId,
      name,
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      documentSecurity
    );
    console.log(`✓ Created collection: ${collectionId}`);
  }
}

type NormalizedAttribute = {
  key: string;
  status?: string;
};

async function listAllAttributes(
  collectionId: string
): Promise<NormalizedAttribute[]> {
  const result = await databases.listAttributes(databaseId, collectionId);
  const rawAttributes = result.attributes ?? [];

  return rawAttributes
    .map((attr): NormalizedAttribute | null => {
      if (typeof attr === "string") {
        return { key: attr };
      }

      if (
        typeof attr === "object" &&
        attr !== null &&
        "key" in attr &&
        typeof (attr as { key?: unknown }).key === "string"
      ) {
        return {
          key: (attr as { key: string }).key,
          status:
            "status" in attr &&
            typeof (attr as { status?: unknown }).status === "string"
              ? (attr as { status?: string }).status
              : undefined,
        };
      }

      return null;
    })
    .filter((attr): attr is NormalizedAttribute => Boolean(attr && attr.key));
}

async function hasAttribute(collectionId: string, key: string) {
  const attributes = await listAllAttributes(collectionId);
  return attributes.some((attr) => attr.key === key);
}

async function waitForAttributes(collectionId: string, keys: string[]) {
  const timeoutMs = 120_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const attributes = await listAllAttributes(collectionId);

    const ready = keys.every((key) =>
      attributes.some(
        (attr) => attr.key === key && (!attr.status || attr.status === "available")
      )
    );

    if (ready) {
      console.log(`✓ Attributes ready for ${collectionId}: ${keys.join(", ")}`);
      return;
    }

    await sleep(2000);
  }

  throw new Error(
    `Timed out waiting for attributes in ${collectionId}: ${keys.join(", ")}`
  );
}

async function ensureStringAttribute(
  collectionId: string,
  key: string,
  size: number,
  required: boolean,
  array = false,
  defaultValue?: string
) {
  if (await hasAttribute(collectionId, key)) {
    console.log(`✓ Attribute exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating string attribute: ${collectionId}.${key}`);
  await databases.createStringAttribute(
    databaseId,
    collectionId,
    key,
    size,
    required,
    defaultValue,
    array
  );
  console.log(`✓ Created attribute: ${collectionId}.${key}`);
}

async function ensureDatetimeAttribute(
  collectionId: string,
  key: string,
  required: boolean
) {
  if (await hasAttribute(collectionId, key)) {
    console.log(`✓ Attribute exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating datetime attribute: ${collectionId}.${key}`);
  await databases.createDatetimeAttribute(databaseId, collectionId, key, required);
  console.log(`✓ Created attribute: ${collectionId}.${key}`);
}

type NormalizedIndex = {
  key: string;
};

async function listAllIndexes(collectionId: string): Promise<NormalizedIndex[]> {
  const result = await databases.listIndexes(databaseId, collectionId);
  const rawIndexes = result.indexes ?? [];

  return rawIndexes
    .map((index): NormalizedIndex | null => {
      if (typeof index === "string") {
        return { key: index };
      }

      if (
        typeof index === "object" &&
        index !== null &&
        "key" in index &&
        typeof (index as { key?: unknown }).key === "string"
      ) {
        return { key: (index as { key: string }).key };
      }

      return null;
    })
    .filter((index): index is NormalizedIndex => Boolean(index && index.key));
}

async function hasIndex(collectionId: string, key: string) {
  const indexes = await listAllIndexes(collectionId);
  return indexes.some((index) => index.key === key);
}

async function ensureIndex(
  collectionId: string,
  key: string,
  type: "key" | "fulltext" | "unique",
  attributes: string[],
  orders?: ("ASC" | "DESC")[]
) {
  if (await hasIndex(collectionId, key)) {
    console.log(`✓ Index exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating index: ${collectionId}.${key}`);

  const mappedType =
    type === "key"
      ? IndexType.Key
      : type === "fulltext"
        ? IndexType.Fulltext
        : IndexType.Unique;

  await databases.createIndex(
    databaseId,
    collectionId,
    key,
    mappedType,
    attributes,
    orders
  );

  console.log(`✓ Created index: ${collectionId}.${key}`);
}

async function main() {
  console.log("Starting Appwrite setup...");

  await ensureDatabase();

  await ensureCollection(profilesId, "Profiles");
  await ensureCollection(conversationsId, "Conversations");
  await ensureCollection(messagesId, "Messages");

  await ensureStringAttribute(profilesId, "userId", 64, true);
  await ensureStringAttribute(profilesId, "username", 32, true);
  await ensureStringAttribute(profilesId, "usernameLower", 32, true);
  await ensureStringAttribute(profilesId, "displayName", 64, false, false, "");

  await waitForAttributes(profilesId, [
    "userId",
    "username",
    "usernameLower",
    "displayName",
  ]);

  await ensureIndex(profilesId, "userId_unique", "unique", ["userId"]);
  await ensureIndex(profilesId, "username_unique", "unique", ["username"]);
  await ensureIndex(
    profilesId,
    "usernameLower_fulltext",
    "fulltext",
    ["usernameLower"]
  );

  await ensureStringAttribute(conversationsId, "type", 16, true);
  await ensureStringAttribute(conversationsId, "participantIds", 64, true, true);
  await ensureStringAttribute(conversationsId, "participantKey", 128, true);
  await ensureStringAttribute(
    conversationsId,
    "lastMessageText",
    2000,
    false,
    false,
    ""
  );
  await ensureDatetimeAttribute(conversationsId, "lastMessageAt", true);
  await ensureDatetimeAttribute(conversationsId, "createdAt", true);
  await ensureStringAttribute(conversationsId, "createdBy", 64, true);

  await waitForAttributes(conversationsId, [
    "type",
    "participantIds",
    "participantKey",
    "lastMessageText",
    "lastMessageAt",
    "createdAt",
    "createdBy",
  ]);

  await ensureIndex(
    conversationsId,
    "participantKey_unique",
    "unique",
    ["participantKey"]
  );
  await ensureIndex(
    conversationsId,
    "lastMessageAt_key",
    "key",
    ["lastMessageAt"],
    ["DESC"]
  );

  await ensureStringAttribute(messagesId, "conversationId", 64, true);
  await ensureStringAttribute(messagesId, "senderId", 64, true);
  await ensureStringAttribute(messagesId, "content", 5000, true);
  await ensureDatetimeAttribute(messagesId, "createdAt", true);
  await ensureStringAttribute(messagesId, "messageType", 16, true);

  await waitForAttributes(messagesId, [
    "conversationId",
    "senderId",
    "content",
    "createdAt",
    "messageType",
  ]);

  await ensureIndex(messagesId, "conversationId_key", "key", ["conversationId"]);
  await ensureIndex(messagesId, "createdAt_key", "key", ["createdAt"], ["ASC"]);

  console.log("✅ Appwrite setup complete.");
}

main().catch((error) => {
  console.error("❌ Appwrite setup failed");
  console.error(error);
  process.exit(1);
});
