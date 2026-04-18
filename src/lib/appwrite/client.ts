import { Account, Client, Databases, ID, Query, type Models } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is missing");
}

if (!projectId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is missing");
}

export const appwriteClient = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

export const account = new Account(appwriteClient);
export const databases = new Databases(appwriteClient);

export { ID, Query, type Models };

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}
