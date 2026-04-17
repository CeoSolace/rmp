"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  account,
  databases,
  ID,
  Query,
  type Models,
  appwriteClient,
} from '@/lib/appwrite/client';
import {
  DATABASE_ID,
  CONVERSATIONS_COLLECTION_ID,
  MESSAGES_COLLECTION_ID,
  PROFILES_COLLECTION_ID,
} from '@/lib/constants';
import { generateParticipantKey } from '@/lib/utils';
import { normalizeUsername } from '@/lib/validators';

/**
 * ChatPage is the main authenticated interface for RampChat. It lists
 * your direct conversations and allows you to search for other users
 * by username to start new DMs. Messages are loaded for the selected
 * conversation and new messages appear in realtime via Appwrite
 * subscriptions.
 */
export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [conversations, setConversations] = useState<Models.Document[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Models.Document | null>(null);
  const [messages, setMessages] = useState<Models.Document[]>([]);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Models.Document[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Load the current user and their conversations on mount
  useEffect(() => {
    async function init() {
      try {
        const current = await account.get();
        setUser(current);
        await loadConversations(current.$id);
      } catch (err) {
        // Unauthenticated; redirect to login
        router.push('/auth');
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConversations(userId: string) {
    setLoadingConversations(true);
    try {
      const res = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [
          // Use contains to match array elements
          Query.contains('participantIds', userId),
          Query.orderDesc('lastMessageAt'),
        ],
      );
      setConversations(res.documents);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  }

  // When a conversation is selected, load its messages and subscribe to realtime updates
  useEffect(() => {
    if (!currentConversation) return;
    let unsubscribe: () => void;
    async function loadMessagesAndSubscribe() {
      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          MESSAGES_COLLECTION_ID,
          [
            Query.equal('conversationId', currentConversation.$id),
            Query.orderAsc('createdAt'),
            Query.limit(100),
          ],
        );
        setMessages(res.documents);
        // Subscribe to new messages for this conversation
        unsubscribe = appwriteClient.subscribe(
          `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
          (payload) => {
            // Only append messages that belong to the active conversation
            // @ts-ignore next-line
            const doc = payload?.payload;
            if (doc && doc.conversationId === currentConversation.$id) {
              setMessages((prev) => [...prev, doc as any]);
            }
          },
        );
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    }
    loadMessagesAndSubscribe();
    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?.$id]);

  // Handle sending a message
  async function sendMessage() {
    if (!messageText.trim() || !currentConversation || !user) return;
    const content = messageText.trim();
    setMessageText('');
    try {
      const now = new Date().toISOString();
      // Create message document
      await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        ID.unique(),
        {
          conversationId: currentConversation.$id,
          senderId: user.$id,
          content,
          createdAt: now,
          messageType: 'text',
        },
      );
      // Update conversation preview
      await databases.updateDocument(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        currentConversation.$id,
        {
          lastMessageText: content,
          lastMessageAt: now,
        },
      );
    } catch (err) {
      console.error('Failed to send message', err);
    }
  }

  // Handle search for users by username
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
        [
          Query.search('usernameLower', q),
          Query.limit(5),
        ],
      );
      // Filter out yourself
      const filtered = res.documents.filter((p) => p.userId !== user.$id);
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search failed', err);
    }
  }

  // Start or open a DM conversation with another user
  async function openDmForUser(target: Models.Document) {
    if (!user) return;
    // Determine participant key for both users
    const participantIds = [user.$id, target.userId];
    const participantKey = generateParticipantKey(participantIds);
    try {
      // Check if conversation exists
      const existing = await databases.listDocuments(
        DATABASE_ID,
        CONVERSATIONS_COLLECTION_ID,
        [Query.equal('participantKey', participantKey), Query.limit(1)],
      );
      let conv: Models.Document;
      if (existing.total > 0) {
        conv = existing.documents[0];
      } else {
        // Create new conversation
        const now = new Date().toISOString();
        const convRes = await databases.createDocument(
          DATABASE_ID,
          CONVERSATIONS_COLLECTION_ID,
          ID.unique(),
          {
            type: 'dm',
            participantIds,
            participantKey,
            lastMessageText: '',
            lastMessageAt: now,
            createdAt: now,
            createdBy: user.$id,
          },
        );
        conv = convRes;
      }
      setCurrentConversation(conv);
      // Ensure conversation list includes this conversation
      setConversations((prev) => {
        const exists = prev.find((c) => c.$id === conv.$id);
        if (exists) return prev;
        return [conv, ...prev];
      });
      setSearch('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to open DM', err);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="mt-2">
            <input
              type="text"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') performSearch();
              }}
              className="w-full p-2 rounded bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {/* search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.$id}
                  onClick={() => openDmForUser(result)}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-gray-700"
                >
                  <div className="text-sm font-medium">{result.displayName || result.username}</div>
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
              {conversations.map((conv) => {
                // Determine other participant for display name
                const otherId = conv.participantIds.find((pid: string) => pid !== user?.$id);
                return (
                  <li key={conv.$id}>
                    <button
                      onClick={() => setCurrentConversation(conv)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-700 ${
                        currentConversation?.$id === conv.$id ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="font-medium truncate">{conv.lastMessageText || 'New conversation'}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(conv.lastMessageAt).toLocaleString()}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.$id}
                  className={`max-w-md ${msg.senderId === user?.$id ? 'ml-auto text-right' : ''}`}
                >
                  <div
                    className={`inline-block px-3 py-2 rounded-lg ${
                      msg.senderId === user?.$id ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700 flex space-x-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                placeholder="Type your message…"
                className="flex-1 p-2 rounded bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={sendMessage}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-sm text-gray-400">Select a conversation or search for a user to start chatting.</p>
          </div>
        )}
      </main>
    </div>
  );
}