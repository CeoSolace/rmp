"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  account,
  databases,
  ID,
  Query,
  type Models,
  appwriteClient,
} from "../../../lib/appwrite/client";
import {
  DATABASE_ID,
  CONVERSATIONS_COLLECTION_ID,
  MESSAGES_COLLECTION_ID,
  PROFILES_COLLECTION_ID,
} from "../../../lib/constants";
import { generateParticipantKey } from "../../../lib/utils";
import { normalizeUsername } from "../../../lib/validators";

export default function ChatPage() {
  const router = useRouter();

  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [conversations, setConversations] = useState<Models.Document[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Models.Document | null>(null);
  const [messages, setMessages] = useState<Models.Document[]>([]);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Models.Document[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const current = await account.get();
        setUser(current);
        await loadConversations(current.$id);
      } catch {
        router.push("/auth");
      }
    }

    void init();
  }, [router]);

  async function loadConversations(userId: string) {
    setLoadingConversations(true);

    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [Query.contains("participantIds", userId), Query.orderDesc("lastMessageAt")]
      );

      setConversations(res.documents);
    } catch (error) {
      console.error("Failed to load conversations", error);
    } finally {
      setLoadingConversations(false);
    }
  }

  useEffect(() => {
    if (!currentConversation) return;

    let unsubscribe: (() => void) | undefined;

    async function loadMessagesAndSubscribe() {
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          [
            Query.equal("conversationId", currentConversation.$id),
            Query.orderAsc("createdAt"),
            Query.limit(100),
          ]
        );

        setMessages(res.documents);

        unsubscribe = appwriteClient.subscribe(
          `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
          (payload: { payload?: Models.Document }) => {
            const doc = payload?.payload;

            if (doc && doc.conversationId === currentConversation.$id) {
              setMessages((prev: Models.Document[]) => {
                const alreadyExists = prev.some(
                  (message: Models.Document) => message.$id === doc.$id
                );
                if (alreadyExists) return prev;
                return [...prev, doc];
              });
            }
          }
        );
      } catch (error) {
        console.error("Failed to load messages", error);
      }
    }

    void loadMessagesAndSubscribe();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentConversation]);

  async function sendMessage() {
    if (!messageText.trim() || !currentConversation || !user) return;

    const content = messageText.trim();
    setMessageText("");

    try {
      const now = new Date().toISOString();

      await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(),
        {
          conversationId: currentConversation.$id,
          senderId: user.$id,
          content,
          createdAt: now,
          messageType: "text",
        }
      );

      await databases.updateDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        currentConversation.$id,
        {
          lastMessageText: content,
          lastMessageAt: now,
        }
      );

      setConversations((prev: Models.Document[]) =>
        prev
          .map((conversation: Models.Document) =>
            conversation.$id === currentConversation.$id
              ? {
                  ...conversation,
                  lastMessageText: content,
                  lastMessageAt: now,
                }
              : conversation
          )
          .sort(
            (a: Models.Document, b: Models.Document) =>
              new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
          )
      );
    } catch (error) {
      console.error("Failed to send message", error);
    }
  }

  async function performSearch() {
    if (!search.trim() || !user) {
      setSearchResults([]);
      return;
    }

    try {
      const q = normalizeUsername(search);

      const res = await databases.listDocuments(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        [Query.search("usernameLower", q), Query.limit(5)]
      );

      const filtered = res.documents.filter(
        (profile: Models.Document) => profile.userId !== user.$id
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error("Search failed", error);
    }
  }

  async function openDmForUser(target: Models.Document) {
    if (!user) return;

    const participantIds = [user.$id, target.userId];
    const participantKey = generateParticipantKey(participantIds);

    try {
      const existing = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [Query.equal("participantKey", participantKey), Query.limit(1)]
      );

      let conversation: Models.Document;

      if (existing.total > 0) {
        conversation = existing.documents[0];
      } else {
        const now = new Date().toISOString();

        conversation = await databases.createDocument(
          DATABASE_ID,
          CONVERSATIONS_COLLECTION_ID,
          ID.unique(),
          {
            type: "dm",
            participantIds,
            participantKey,
            lastMessageText: "",
            lastMessageAt: now,
            createdAt: now,
            createdBy: user.$id,
          }
        );
      }

      setCurrentConversation(conversation);

      setConversations((prev: Models.Document[]) => {
        const exists = prev.some((item: Models.Document) => item.$id === conversation.$id);
        if (exists) return prev;
        return [conversation, ...prev];
      });

      setSearch("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to open DM", error);
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Conversations</h2>

          <div className="mt-2">
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  void performSearch();
                }
              }}
              className="w-full p-2 rounded bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto">
              {searchResults.map((result: Models.Document) => (
                <button
                  key={result.$id}
                  onClick={() => void openDmForUser(result)}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-gray-700"
                >
                  <div className="text-sm font-medium">
                    {result.displayName || result.username}
                  </div>
                  <div className="text-xs text-gray-400">@{result.username}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <p className="p-4 text-sm text-gray-400">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map((conversation: Models.Document) => (
                <li key={conversation.$id}>
                  <button
                    onClick={() => setCurrentConversation(conversation)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 ${
                      currentConversation?.$id === conversation.$id ? "bg-gray-700" : ""
                    }`}
                  >
                    <div className="font-medium truncate">
                      {conversation.lastMessageText || "New conversation"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {conversation.lastMessageAt
                        ? new Date(conversation.lastMessageAt).toLocaleString()
                        : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message: Models.Document) => (
                <div
                  key={message.$id}
                  className={`max-w-md ${
                    message.senderId === user?.$id ? "ml-auto text-right" : ""
                  }`}
                >
                  <div
                    className={`inline-block px-3 py-2 rounded-lg ${
                      message.senderId === user?.$id
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-700 text-gray-100"
                    }`}
                  >
                    {message.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700 flex space-x-2">
              <input
                type="text"
                value={messageText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter") {
                    void sendMessage();
                  }
                }}
                placeholder="Type your message…"
                className="flex-1 p-2 rounded bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => void sendMessage()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-sm text-gray-400">
              Select a conversation or search for a user to start chatting.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
