export const AUTH_STORAGE_KEY = "pm_user";

export const validateCredentials = (username: string, password: string): boolean => {
  return username === "user" && password === "password";
};

export const getStoredUser = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(AUTH_STORAGE_KEY);
};

export const setStoredUser = (username: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_STORAGE_KEY, username);
  }
};

export const clearStoredUser = (): void => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

