import { useState } from "react";

export function SignInForm() {
  const [submitting, setSubmitting] = useState(false);

  const handleGoogle = () => {
    setSubmitting(true);
    // Redirect to server Google OAuth flow
    window.location.href = "/auth/google";
  };

  return (
    <div className="w-full">
      <button
        className="auth-button w-full"
        onClick={handleGoogle}
        disabled={submitting}
      >
        Continue with Google
      </button>
    </div>
  );
}


