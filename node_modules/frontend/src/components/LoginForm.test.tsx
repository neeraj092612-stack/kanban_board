import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginForm } from "@/components/LoginForm";

describe("LoginForm", () => {
  it("renders form inputs and submit button", () => {
    render(<LoginForm onLogin={() => {}} />);
    expect(screen.getByTestId("login-username")).toBeInTheDocument();
    expect(screen.getByTestId("login-password")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit")).toBeInTheDocument();
  });

  it("shows error for incorrect credentials", async () => {
    render(<LoginForm onLogin={() => {}} />);
    await userEvent.type(screen.getByTestId("login-username"), "baduser");
    await userEvent.type(screen.getByTestId("login-password"), "badpass");
    await userEvent.click(screen.getByTestId("login-submit"));

    expect(screen.getByTestId("login-error")).toBeInTheDocument();
    expect(screen.getByText(/Invalid username or password/i)).toBeInTheDocument();
  });

  it("calls onLogin for valid credentials", async () => {
    const handleLogin = vi.fn();
    render(<LoginForm onLogin={handleLogin} />);
    await userEvent.type(screen.getByTestId("login-username"), "user");
    await userEvent.type(screen.getByTestId("login-password"), "password");
    await userEvent.click(screen.getByTestId("login-submit"));

    expect(handleLogin).toHaveBeenCalledWith("user");
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument();
  });
});

