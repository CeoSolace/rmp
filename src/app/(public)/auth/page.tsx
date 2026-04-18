"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { account, databases, ID, Query } from "../../../lib/appwrite/client";
import {
  validateEmail,
  validateUsername,
  normalizeUsername,
} from "../../../lib/validators";
import {
  DATABASE_ID,
  PROFILES_COLLECTION_ID,
  RESERVED_USERNAMES,
} from "../../../lib/constants";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const email = form.email.trim();
      const password = form.password;

      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email.");
      }

      // Appwrite account creation requires 8+ chars
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (mode === "signup") {
        const username = form.username.trim();

        if (!validateUsername(username)) {
          throw new Error(
            "Username must be 3 to 20 characters and only use letters, numbers, underscores, or periods."
          );
        }

        const usernameLower = normalizeUsername(username);

        if (RESERVED_USERNAMES.includes(usernameLower as never)) {
          throw new Error("This username is reserved.");
        }

        const existing = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          [Query.equal("usernameLower", usernameLower), Query.limit(1)]
        );

        if (existing.total > 0) {
          throw new Error("Username already in use.");
        }

        const userId = ID.unique();
        const displayName = form.displayName.trim() || username;
        const now = new Date().toISOString();

        await account.create({
          userId,
          email,
          password,
          name: displayName,
        });

        await account.createEmailPasswordSession({
          email,
          password,
        });

        const isOwner =
          email.toLowerCase() ===
          (process.env.NEXT_PUBLIC_OWNER_EMAIL || "").toLowerCase();

        await databases.createDocument(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          ID.unique(),
          {
            userId,
            username,
            usernameLower,
            displayName,
            bio: "",
            avatarUrl: "",
            isOwner,
            createdAt: now,
            updatedAt: now,
          }
        );
      } else {
        await account.createEmailPasswordSession({
          email,
          password,
        });
      }

      router.push("/chat");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold">
          {mode === "login"
            ? "Login to RampChat"
            : "Create your RampChat account"}
        </h1>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="mt-1 w-full rounded bg-gray-700 p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label htmlFor="username" className="block text-sm font-medium">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="mt-1 w-full rounded bg-gray-700 p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium"
                >
                  Display Name (optional)
                </label>
                <input
                  type="text"
                  id="displayName"
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  className="mt-1 w-full rounded bg-gray-700 p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full rounded bg-gray-700 p-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-indigo-600 py-2 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                className="text-indigo-400 underline"
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="text-indigo-400 underline"
                onClick={() => setMode("login")}
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
