import { useEffect, useState } from "react";
import { getMe } from "./api";

export function SignOutButton() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    getMe().then((u) => setIsAuthenticated(!!u)).catch(() => setIsAuthenticated(false));
  }, []);

  if (!isAuthenticated) return null;

  const handleSignOut = async () => {
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    window.location.reload();
  };

  return (
    <button
      className="px-4 py-2 rounded bg-white text-secondary border border-gray-200 font-semibold hover:bg-gray-50 hover:text-secondary-hover transition-colors shadow-sm hover:shadow"
      onClick={handleSignOut}
    >
      Sign out
    </button>
  );
}
