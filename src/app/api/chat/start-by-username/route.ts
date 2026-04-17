import { NextRequest, NextResponse } from "next/server";
import { account } from "@/lib/appwrite/client";
import {
  findProfileByUsername,
  createOrGetDirectConversation,
} from "@/lib/chat/startConversation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawUsername = String(body?.username || "").trim();

    if (!rawUsername) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    const currentUser = await account.get();
    const targetProfile = await findProfileByUsername(rawUsername);

    if (!targetProfile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const conversation = await createOrGetDirectConversation(
      currentUser.$id,
      targetProfile.userId
    );

    return NextResponse.json({
      success: true,
      conversationId: conversation.$id,
      targetUser: {
        userId: targetProfile.userId,
        username: targetProfile.username,
        displayName: targetProfile.displayName || targetProfile.username,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start conversation.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
