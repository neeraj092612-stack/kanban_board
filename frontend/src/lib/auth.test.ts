import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AUTH_STORAGE_KEY,
  clearStoredUser,
  getStoredUser,
  setStoredUser,
  subscribeToUser,
  validateCredentials,
} from "@/lib/auth";

describe("auth helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("validates credentials accurately", () => {
    expect(validateCredentials("user", "password")).toBe(true);
    expect(validateCredentials("wrong", "password")).toBe(false);
    expect(validateCredentials("user", "wrong")).toBe(false);
    expect(validateCredentials("", "")).toBe(false);
  });

  it("manages localStorage user persistence", () => {
    expect(getStoredUser()).toBeNull();
    setStoredUser("user");
    expect(getStoredUser()).toBe("user");
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe("user");
    clearStoredUser();
    expect(getStoredUser()).toBeNull();
  });

  it("notifies subscribers on sign-in and sign-out", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToUser(listener);
    setStoredUser("user");
    clearStoredUser();
    unsubscribe();
    setStoredUser("user");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
