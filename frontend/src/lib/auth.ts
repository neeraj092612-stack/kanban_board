export const AUTH_STORAGE_KEY = "pm_user";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const validateCredentials = (username: string, password: string): boolean =>
  username === "user" && password === "password";

export const getStoredUser = (): string | null => localStorage.getItem(AUTH_STORAGE_KEY);

export const setStoredUser = (username: string): void => {
  localStorage.setItem(AUTH_STORAGE_KEY, username);
  notify();
};

export const clearStoredUser = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  notify();
};

// For useSyncExternalStore: re-render on sign-in/out in this tab or another.
export const subscribeToUser = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};
