"use client";

import { useEffect, useMemo, useState } from "react";
import {
  appwriteClient,
  databases,
  Query,
  type Models,
} from "@/lib/appwrite/client";
import AddUsernameForm from "@/components/chat/AddUsernameForm";

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const MESSAGES_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;
const CONVERSATIONS_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CONVERSATIONS_COLLECTION_ID!;

type MessageDoc = Models.Document & {
  conversationId?: string;
  senderId?: string;
  body?: string;
};

type ConversationDoc = Models.Document & {
  type?: string;
  participantIds?: string[];
  participantKey?: string;
};

type RealtimeResponse = {
  events?: string[];
  payload?: unknown;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [conversations, setConversations] = useState<ConversationDoc[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubMessages: (() => void) | undefined;
    let unsubConversations: (() => void) | undefined;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [conversationRes, messageRes] = await Promise.all([
          databases.listDocuments<ConversationDoc>(
            DATABASE_ID,
            CONVERSATIONS_COLLECTION_ID,
            [Query.orderDesc("$updatedAt"), Query.limit(100)]
          ),
          databases.listDocuments<MessageDoc>(
            DATABASE_ID,
            MESSAGES_COLLECTION_ID,
            [Query.orderDesc("$createdAt"), Query.limit(200)]
          ),
        ]);

        if (cancelled) return;

        setConversations(conversationRes.documents);
        setMessages(messageRes.documents);

        if (conversationRes.documents.length > 0) {
          setSelectedConversationId((current) =>
            current ?? conversationRes.documents[0].$id
          );
        }

        unsubMessages = appwriteClient.subscribe(
          `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
          (response: RealtimeResponse) => {
            const doc = response.payload as MessageDoc | undefined;
            if (!doc?.$id) return;

            const events = response.events || [];
            const isCreate = events.some((event) => event.includes(".create"));
            const isUpdate = events.some((event) => event.includes(".update"));
            const isDelete = events.some((event) => event.includes(".delete"));

            if (isCreate) {
              setMessages((prev) => {
                if (prev.some((m) => m.$id === doc.$id)) return prev;
                return [doc, ...prev];
              });
            } else if (isUpdate) {
              setMessages((prev) =>
                prev.map((m) => (m.$id === doc.$id ? { ...m, ...doc } : m))
              );
            } else if (isDelete) {
              setMessages((prev) => prev.filter((m) => m.$id !== doc.$id));
            }
          }
        );

        unsubConversations = appwriteClient.subscribe(
          `databases.${DATABASE_ID}.collections.${CONVERSATIONS_COLLECTION_ID}.documents`,
          (response: RealtimeResponse) => {
            const doc = response.payload as ConversationDoc | undefined;
            if (!doc?.$id) return;

            const events = response.events || [];
            const isCreate = events.some((event) => event.includes(".create"));
            const isUpdate = events.some((event) => event.includes(".update"));
            const isDelete = events.some((event) => event.includes(".delete"));

            if (isCreate) {
              setConversations((prev) => {
                if (prev.some((c) => c.$id === doc.$id)) return prev;
                return [doc, ...prev];
              });

              setSelectedConversationId((current) => current ?? doc.$id);
            } else if (isUpdate) {
              setConversations((prev) =>
                prev.map((c) => (c.$id === doc.$id ? { ...c, ...doc } : c))
              );
            } else if (isDelete) {
              setConversations((prev) => prev.filter((c) => c.$id !== doc.$id));
              setSelectedConversationId((current) =>
                current === doc.$id ? null : current
              );
            }
          }
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load chat data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (unsubMessages) unsubMessages();
      if (unsubConversations) unsubConversations();
    };
  }, []);

  const filteredMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messages
      .filter((message) => message.conversationId === selectedConversationId)
      .sort((a, b) => {
        const aDate = new Date(a.$createdAt || 0).getTime();
        const bDate = new Date(b.$createdAt || 0).getTime();
        return aDate - bDate;
      });
  }, [messages, selectedConversationId]);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 md:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border p-4">
        <h1 className="mb-4 text-2xl font-bold">Chat</h1>

        <div className="mb-6">
          <AddUsernameForm />
        </div>

        <h2 className="mb-3 text-sm font-semibold opacity-70">Conversations</h2>

        <div className="space-y-2">
          {conversations.map((conversation) => {
            const active = conversation.$id === selectedConversationId;

            return (
              <button
                key={conversation.$id}
                type="button"
                onClick={() => setSelectedConversationId(conversation.$id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  active ? "bg-neutral-100 dark:bg-neutral-900" : ""
                }`}
              >
                <div className="text-sm font-medium">
                  {conversation.type === "direct"
                    ? "Direct message"
                    : conversation.type || "Conversation"}
                </div>
                <div className="text-xs opacity-70">{conversation.$id}</div>
              </button>
            );
          })}

          {!loading && conversations.length === 0 ? (
            <p className="text-sm opacity-70">No conversations yet.</p>
          ) : null}
        </div>
      </aside>

      <main className="rounded-2xl border p-4">
        {loading ? <p>Loading chat...</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        {!loading && !selectedConversationId ? (
          <div className="flex h-full min-h-[420px] items-center justify-center">
            <p className="text-sm opacity-70">
              Pick a conversation or add a username to start one.
            </p>
          </div>
        ) : null}

        {!loading && selectedConversationId ? (
          <div className="flex min-h-[420px] flex-col">
            <div className="mb-4 border-b pb-3">
              <h2 className="text-lg font-semibold">Messages</h2>
              <p className="text-xs opacity-70">
                Conversation ID: {selectedConversationId}
              </p>
            </div>

            <div className="flex-1 space-y-3">
              {filteredMessages.map((message) => (
                <div key={message.$id} className="rounded-xl border p-3">
                  <div className="mb-1 text-xs opacity-70">
                    {message.senderId || "Unknown sender"}
                  </div>
                  <div className="text-sm">{String(message.body || "")}</div>
                </div>
              ))}

              {filteredMessages.length === 0 ? (
                <p className="text-sm opacity-70">No messages yet.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
