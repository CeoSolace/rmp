import { Client, Databases, Users } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint) throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is missing");
if (!projectId) throw new Error("NEXT_PUBLIC_APPWRITE_PROJECT_ID is missing");
if (!apiKey) throw new Error("APPWRITE_API_KEY is missing");

const adminClient = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

export const adminDatabases = new Databases(adminClient);
export const adminUsers = new Users(adminClient);
