import { useState } from "react";
import { SignOutButton } from "../SignOutButton";
import { User } from "../api";
import { useTheme } from "../lib/ThemeProvider";

function Avatar({ user }: { user: User }) {
  const [imgError, setImgError] = useState(false);
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  if (user.picture && !imgError) {
    return (
      <img
        src={user.picture}
        alt={user.name || "User"}
        className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-gray-100 dark:ring-gray-700">
      {initial}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}

export function Navbar({ user }: { user: User | null }) {
  return (
    <nav className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
              MP
            </div>
            <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              Maisha Predictions
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeToggle />
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Avatar user={user} />
                <span className="truncate max-w-[120px]">{user.name || user.email}</span>
              </div>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
