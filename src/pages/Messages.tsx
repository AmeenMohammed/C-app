
import { TopBar } from "@/components/TopBar";

const Messages = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Messages" showBackButton={true} />
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Messages</h2>
          <p className="text-gray-600">No messages yet.</p>
        </div>
      </main>
    </div>
  );
};

export default Messages;
