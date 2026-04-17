import { Client, Databases, ID, Permission, Role } from "node-appwrite";

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

async function existsCollection(collectionId: string) {
  try {
    await databases.getCollection({
      databaseId,
      collectionId,
    });
    return true;
  } catch {
    return false;
  }
}

async function existsAttribute(collectionId: string, key: string) {
  try {
    const result = await databases.listAttributes({
      databaseId,
      collectionId,
    });

    return result.attributes.some((attr: any) => attr.key === key);
  } catch {
    return false;
  }
}

async function existsIndex(collectionId: string, key: string) {
  try {
    await databases.getIndex({
      databaseId,
      collectionId,
      key,
    });
    return true;
  } catch {
    return false;
  }
}

async function createCollectionIfMissing(
  collectionId: string,
  name: string,
  documentSecurity = false
) {
  const exists = await existsCollection(collectionId);

  if (exists) {
    console.log(`✓ Collection exists: ${collectionId}`);
    return;
  }

  console.log(`Creating collection: ${collectionId}`);

  await databases.createCollection({
    databaseId,
    collectionId,
    name,
    documentSecurity,
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
  });

  console.log(`✓ Created collection: ${collectionId}`);
}

async function createStringAttributeIfMissing(
  collectionId: string,
  key: string,
  size: number,
  required: boolean,
  array = false,
  defaultValue?: string
) {
  const exists = await existsAttribute(collectionId, key);

  if (exists) {
    console.log(`✓ Attribute exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating string attribute: ${collectionId}.${key}`);

  await databases.createStringAttribute({
    databaseId,
    collectionId,
    key,
    size,
    required,
    array,
    default: defaultValue,
  });

  console.log(`✓ Created attribute: ${collectionId}.${key}`);
}

async function createDatetimeAttributeIfMissing(
  collectionId: string,
  key: string,
  required: boolean,
  defaultValue?: string
) {
  const exists = await existsAttribute(collectionId, key);

  if (exists) {
    console.log(`✓ Attribute exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating datetime attribute: ${collectionId}.${key}`);

  await databases.createDatetimeAttribute({
    databaseId,
    collectionId,
    key,
    required,
    default: defaultValue,
  });

  console.log(`✓ Created attribute: ${collectionId}.${key}`);
}

async function createIndexIfMissing(
  collectionId: string,
  key: string,
  type: "key" | "fulltext" | "unique",
  attributes: string[],
  orders?: ("ASC" | "DESC")[]
) {
  const exists = await existsIndex(collectionId, key);

  if (exists) {
    console.log(`✓ Index exists: ${collectionId}.${key}`);
    return;
  }

  console.log(`Creating index: ${collectionId}.${key}`);

  await databases.createIndex({
    databaseId,
    collectionId,
    key,
    type,
    attributes,
    orders,
  });

  console.log(`✓ Created index: ${collectionId}.${key}`);
}

async function waitForAttributes(collectionId: string, keys: string[]) {
  console.log(`Waiting for attributes in ${collectionId}: ${keys.join(", ")}`);

  const timeoutMs = 60_000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const result = await databases.listAttributes({
      databaseId,
      collectionId,
    });

    const ready = keys.every((key) =>
      result.attributes.some((attr: any) => attr.key === key && attr.status === "available")
    );

    if (ready) {
      console.log(`✓ Attributes ready in ${collectionId}`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Timed out waiting for attributes in ${collectionId}`);
}

async function main() {
  console.log("Starting Appwrite setup...");

  await createCollectionIfMissing(profilesId, "Profiles");
  await createCollectionIfMissing(conversationsId, "Conversations");
  await createCollectionIfMissing(messagesId, "Messages");

  await createStringAttributeIfMissing(profilesId, "userId", 64, true);
  await createStringAttributeIfMissing(profilesId, "username", 32, true);
  await createStringAttributeIfMissing(profilesId, "usernameLower", 32, true);
  await createStringAttributeIfMissing(profilesId, "displayName", 64, false, false, "");

  await waitForAttributes(profilesId, [
    "userId",
    "username",
    "usernameLower",
    "displayName",
  ]);

  await createIndexIfMissing(profilesId, "userId_unique", "unique", ["userId"]);
  await createIndexIfMissing(profilesId, "username_unique", "unique", ["username"]);
  await createIndexIfMissing(profilesId, "usernameLower_search", "fulltext", ["usernameLower"]);

  await createStringAttributeIfMissing(conversationsId, "type", 16, true);
  await createStringAttributeIfMissing(conversationsId, "participantIds", 64, true, true);
  await createStringAttributeIfMissing(conversationsId, "participantKey", 128, true);
  await createStringAttributeIfMissing(
    conversationsId,
    "lastMessageText",
    2000,
    false,
    false,
    ""
  );
  await createDatetimeAttributeIfMissing(conversationsId, "lastMessageAt", true);
  await createDatetimeAttributeIfMissing(conversationsId, "createdAt", true);
  await createStringAttributeIfMissing(conversationsId, "createdBy", 64, true);

  await waitForAttributes(conversationsId, [
    "type",
    "participantIds",
    "participantKey",
    "lastMessageText",
    "lastMessageAt",
    "createdAt",
    "createdBy",
  ]);

  await createIndexIfMissing(
    conversationsId,
    "participantKey_unique",
    "unique",
    ["participantKey"]
  );
  await createIndexIfMissing(
    conversationsId,
    "participantIds_key",
    "key",
    ["participantIds"]
  );
  await createIndexIfMissing(
    conversationsId,
    "lastMessageAt_key",
    "key",
    ["lastMessageAt"],
    ["DESC"]
  );

  await createStringAttributeIfMissing(messagesId, "conversationId", 64, true);
  await createStringAttributeIfMissing(messagesId, "senderId", 64, true);
  await createStringAttributeIfMissing(messagesId, "content", 5000, true);
  await createDatetimeAttributeIfMissing(messagesId, "createdAt", true);
  await createStringAttributeIfMissing(messagesId, "messageType", 16, true);

  await waitForAttributes(messagesId, [
    "conversationId",
    "senderId",
    "content",
    "createdAt",
    "messageType",
  ]);

  await createIndexIfMissing(messagesId, "conversationId_key", "key", ["conversationId"]);
  await createIndexIfMissing(messagesId, "createdAt_key", "key", ["createdAt"], ["ASC"]);

  console.log("✅ Appwrite setup complete.");
}

main().catch((error) => {
  console.error("❌ Appwrite setup failed");
  console.error(error);
  process.exit(1);
});
