import { NextRequest, NextResponse } from "next/server";
import { ID, Query, Models } from "node-appwrite";
import { adminDatabases, adminUsers } from "@/lib/appwrite/server";
import { getUsernameError, normalizeUsername } from "@/lib/usernames";

const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const profilesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

type ProfileDoc = Models.Document & {
  userId: string;
  email: string;
  username: string;
  usernameLower: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const username = String(body?.username || "").trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const usernameError = getUsernameError(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    const usernameLower = normalizeUsername(username);

    const existingUsername = await adminDatabases.listDocuments<ProfileDoc>(
      databaseId,
      profilesCollectionId,
      [Query.equal("usernameLower", usernameLower), Query.limit(1)]
    );

    if (existingUsername.documents.length > 0) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    const createdUser = await adminUsers.create(
      ID.unique(),
      email,
      undefined,
      password,
      username
    );

    const now = new Date().toISOString();

    await adminDatabases.createDocument(
      databaseId,
      profilesCollectionId,
      ID.unique(),
      {
        userId: createdUser.$id,
        email,
        username,
        usernameLower,
        displayName: username,
        bio: "",
        avatarUrl: "",
        createdAt: now,
        updatedAt: now,
      }
    );

    return NextResponse.json({
      success: true,
      userId: createdUser.$id,
      username,
    });
  } catch (error: any) {
    const message =
      typeof error?.message === "string"
        ? error.message
        : "Failed to create account.";

    if (
      message.toLowerCase().includes("email") &&
      message.toLowerCase().includes("already")
    ) {
      return NextResponse.json(
        { error: "That email is already registered." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
