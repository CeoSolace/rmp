import AddUsernameForm from "@/src/components/chat/AddUsernameForm";

export default function MessagesPage() {
  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <AddUsernameForm />
    </div>
  );
}
