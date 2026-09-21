"use client";

import { useState } from "react";
import { validateCredentials } from "@/lib/auth";

type LoginFormProps = {
  onLogin: (username: string) => void;
};

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateCredentials(username, password)) {
      setError(null);
      onLogin(username);
    } else {
      setError("Invalid username or password. Use user and password.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <div className="relative w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-white/90 p-10 shadow-[var(--shadow)] backdrop-blur">
        <div className="h-1.5 w-12 rounded-full bg-[var(--accent-yellow)]" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Kanban Studio
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          Sign In
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--gray-text)]">
          Enter your credentials to access your project board.
        </p>

        {error ? (
          <div
            data-testid="login-error"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Username
            </label>
            <input
              id="username"
              data-testid="login-username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user"
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]"
            >
              Password
            </label>
            <input
              id="password"
              data-testid="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="mt-2 w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            className="mt-2 w-full rounded-2xl bg-[var(--purple-secondary)] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(117,57,145,0.25)] transition hover:opacity-90 active:scale-[0.99]"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs text-[var(--gray-text)]">
            Demo Credentials: <span className="font-semibold text-[var(--navy-dark)]">user</span> / <span className="font-semibold text-[var(--navy-dark)]">password</span>
          </p>
        </div>
      </div>
    </div>
  );
};

