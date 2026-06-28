import { useEffect, useState } from "react";
import { getMe, User } from "./api";
import { SignInForm } from "./SignInForm.tsx";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard.tsx";
import { Navbar } from "./components/Navbar.tsx";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : user ? (
          <Dashboard user={user} />
        ) : (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Maisha Predictions
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                AI-powered football betting predictions from top European leagues
              </p>
            </div>
            <SignInForm />
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}
