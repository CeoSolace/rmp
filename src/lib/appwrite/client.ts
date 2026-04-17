import { Account, Client, Databases, ID, Query, type Models } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID as string);

export const appwriteClient = client;
export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query, type Models };

export async function getCurrentUser() {
  try {
    return await account.get();
  } catch {
    return null;
  }
}
