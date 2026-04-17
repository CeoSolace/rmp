import { Client, Account, Databases, ID, Query, Models } from 'appwrite';

// Initialise the Appwrite client for browser-side usage. Environment
// variables prefixed with NEXT_PUBLIC are exposed to the client. See
// `/app/api/` routes for server-side usage of Appwrite. This client
// should only be used for operations that occur on behalf of the
// authenticated user (for example, login, signup and listing your own
// data). Do not use admin secrets on the client.

const client = new Client();

if (typeof window !== 'undefined') {
  client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);
}

export const account = new Account(client);
export const databases = new Databases(client);
export { ID, Query, type Models };

// Export the underlying client so callers can subscribe to realtime events.
export const appwriteClient = client;

// Helper to fetch the current user on the client. Returns null if
// unauthenticated. This wraps `account.get()` in a try/catch so that
// unauthenticated responses don't throw.
export async function getCurrentUser() {
  try {
    const user = await account.get();
    return user;
  } catch (error) {
    return null;
  }
}