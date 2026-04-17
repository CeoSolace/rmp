import { Client, Databases, ID, Query, Account } from 'appwrite';

// Server-side Appwrite client. This file should only be imported from
// server-side code such as API routes or server actions. It reads
// environment variables that are never exposed to the client. In this
// starter we deliberately avoid including an API key to demonstrate
// usage without elevated privileges.

const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const serverDatabases = new Databases(client);
export const serverAccount = new Account(client);
export { ID, Query };