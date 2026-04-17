import { redirect } from 'next/navigation';

export default function Home() {
  // Immediately forward the user into the chat section. The chat page
  // itself performs its own authentication check and will redirect
  // unauthenticated users to the auth page.
  redirect('/chat');
}