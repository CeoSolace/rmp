"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  account,
  databases,
  Query,
} from '@/lib/appwrite/client';
import {
  DATABASE_ID,
  PROFILES_COLLECTION_ID,
} from '@/lib/constants';

/**
 * Settings page allows the authenticated user to edit their public
 * profile information including display name, bio and avatar image.
 */
export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    async function init() {
      try {
        const user = await account.get();
        setUserId(user.$id);
        const res = await databases.listDocuments(
          DATABASE_ID,
          PROFILES_COLLECTION_ID,
          [Query.equal('userId', user.$id), Query.limit(1)],
        );
        if (res.total > 0) {
          const doc = res.documents[0];
          setProfileId(doc.$id);
          setDisplayName(doc.displayName || '');
          setBio(doc.bio || '');
          setAvatarUrl(doc.avatarUrl || '');
        }
      } catch (err) {
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profileId) return;
    setSaving(true);
    setError(null);
    try {
      await databases.updateDocument(
        DATABASE_ID,
        PROFILES_COLLECTION_ID,
        profileId,
        {
          displayName: displayName.trim(),
          bio: bio.trim(),
          avatarUrl,
          updatedAt: new Date().toISOString(),
        },
      );
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate file size (max ~2MB) and type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error('Upload failed');
      }
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-4">Profile Settings</h1>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center space-x-4">
          <img
            src={avatarUrl || 'https://via.placeholder.com/80'}
            alt="Avatar"
            className="w-20 h-20 rounded-full object-cover"
          />
          <div>
            <label className="block text-sm font-medium mb-1">Avatar</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="text-sm text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium">Display Name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full mt-1 p-2 rounded bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
          ></textarea>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}