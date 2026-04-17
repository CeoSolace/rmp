"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AddUsernameForm() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat/start-by-username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to start chat.");
      }

      setUsername("");
      router.push(`/messages/${data.conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium">Add username</label>

      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          className="w-full rounded-xl border px-3 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border px-4 py-2 font-medium"
        >
          {loading ? "Starting..." : "Message"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </form>
  );
}
