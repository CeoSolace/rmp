"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { account, databases, ID, Query } from '@/lib/appwrite/client';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  normalizeUsername,
} from '@/lib/validators';
import {
  DATABASE_ID,
  PROFILES_COLLECTION_ID,
  RESERVED_USERNAMES,
} from '@/lib/constants';

/**
 * Authentication page for RampChat.
 *
 * This component toggles between login and signup modes. During signup
 * an Appwrite account is created, the user is logged in, and a
 * profile document is created in the `rc_profiles` collection. Usernames
 * are validated and normalised to lowercase to ensure uniqueness.
 */
export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    username: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const email = form.email.trim();
      const password = form.password;
      if (!validateEmail(email)) throw new Error('Please enter a valid email.');
      if (!validatePassword(password)) throw new Error('Password must be at least 6 characters.');
      if (mode === 'signup') {
        const username = form.username.trim();
        if (!validateUsername(username)) {
          throw new Error('Username must be 3–20 characters and contain only letters, numbers, underscores or periods.');
        }
        const usernameLower = normalizeUsername(username);
        if (RESERVED_USERNAMES.includes(usernameLower)) {
          throw new Error('This username is reserved.');
        }
        // Check if username already exists
        const existing = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          [Query.equal('usernameLower', usernameLower), Query.limit(1)],
        );
        if (existing.total > 0) {
          throw new Error('Username already in use.');
        }
        // Create user
        const userId = ID.unique();
        await account.create(userId, email, password);
        await account.createEmailSession(email, password);
        // Create profile document
        const displayName = form.displayName.trim() || username;
        const now = new Date().toISOString();
        // Determine if this user should be marked as the owner. Compare
        // the email used during signup against the configured owner
        // email. Only public variables can be accessed on the client.
        const isOwner =
          email.toLowerCase() ===
          (process.env.NEXT_PUBLIC_OWNER_EMAIL || process.env.OWNER_EMAIL)?.toLowerCase();
        await databases.createDocument(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          ID.unique(),
          {
            userId,
            username,
            usernameLower,
            displayName,
            bio: '',
            avatarUrl: '',
            isOwner,
            createdAt: now,
            updatedAt: now,
          },
        );
      } else {
        // Login mode
        await account.createEmailSession(email, password);
      }
      router.push('/chat');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg p-6 shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {mode === 'login' ? 'Login to RampChat' : 'Create your RampChat account'}
        </h1>
        {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full mt-1 p-2 rounded bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          {mode === 'signup' && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="w-full mt-1 p-2 rounded bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium">Display Name (optional)</label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  className="w-full mt-1 p-2 rounded bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full mt-1 p-2 rounded bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-sm mt-4">
          {mode === 'login' ? (
            <>
              Don’t have an account?{' '}
              <button
                className="underline text-indigo-400"
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className="underline text-indigo-400"
                onClick={() => setMode('login')}
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}