import { useState } from "react";

export function SignInForm() {
  const [submitting, setSubmitting] = useState(false);

  const handleGoogle = () => {
    setSubmitting(true);
    window.location.href = "/auth/google";
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
          MP
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Sign in to access AI-powered betting predictions
        </p>
      </div>
      <button
        onClick={handleGoogle}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ease-out shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>{submitting ? "Redirecting..." : "Continue with Google"}</span>
      </button>
      <p className="text-xs text-gray-400 text-center">
        By signing in, you agree to our terms of service
      </p>
    </div>
  );
}


