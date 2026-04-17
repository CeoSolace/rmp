import AddUsernameForm from "@/components/chat/AddUsernameForm";

export default function MessagesPage() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Messages</h1>
      <AddUsernameForm />
    </div>
  );
}
