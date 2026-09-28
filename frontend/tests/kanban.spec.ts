import { expect, test, type Page } from "@playwright/test";
import { demoApiBoard } from "../src/test/fixtures";

const loginUser = async (page: Page) => {
  await page.goto("/");
  await page.getByTestId("login-username").fill("user");
  await page.getByTestId("login-password").fill("password");
  await page.getByTestId("login-submit").click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
};

const dragCardToColumn = async (page: Page, cardId: string, columnId: string) => {
  const card = page.getByTestId(`card-${cardId}`);
  const targetColumn = page.getByTestId(`column-${columnId}`);
  const emptyDropZone = targetColumn.getByTestId(`empty-drop-zone-${columnId}`);
  const target = (await emptyDropZone.isVisible())
    ? emptyDropZone
    : targetColumn.getByTestId(`card-list-${columnId}`);
  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox) {
    throw new Error("Unable to resolve drag coordinates.");
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 }
  );
  await page.mouse.up();
};

// Board changes persist, so every test starts from the demo board.
test.beforeEach(async ({ request }) => {
  const response = await request.put("/api/board", { data: demoApiBoard });
  expect(response.ok()).toBe(true);
});

test("requires authentication and displays error for invalid credentials", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);

  await page.getByTestId("login-username").fill("baduser");
  await page.getByTestId("login-password").fill("badpass");
  await page.getByTestId("login-submit").click();

  await expect(page.getByTestId("login-error")).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});

test("authenticates with valid credentials, persists session, and logs out", async ({ page }) => {
  await loginUser(page);

  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);
  await expect(page.getByTestId("logout-button")).toBeVisible();

  // Reload page to verify session persistence
  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(5);

  // Logout
  await page.getByTestId("logout-button").click();
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await expect(page.locator('[data-testid^="column-"]')).toHaveCount(0);
});

test("allows adding a card when authenticated", async ({ page }) => {
  await loginUser(page);

  const firstColumn = page.locator('[data-testid^="column-"]').first();
  await firstColumn.getByRole("button", { name: /add a card/i }).click();
  await firstColumn.getByPlaceholder("Card title").fill("Playwright card");
  await firstColumn.getByPlaceholder("Details").fill("Added via e2e.");
  await firstColumn.getByRole("button", { name: /add card/i }).click();
  await expect(firstColumn.getByText("Playwright card")).toBeVisible();
});

test("allows moving a card between columns when authenticated", async ({ page }) => {
  await loginUser(page);

  const targetColumn = page.getByTestId("column-col-review");
  await dragCardToColumn(page, "card-1", "col-review");
  await expect(targetColumn.getByTestId("card-card-1")).toBeVisible();
});

test("moves a card into an empty column", async ({ page }) => {
  await loginUser(page);

  const reviewColumn = page.getByTestId("column-col-review");
  await dragCardToColumn(page, "card-6", "col-backlog");
  await expect(reviewColumn.getByText("Drop a card here")).toBeVisible();

  await dragCardToColumn(page, "card-1", "col-review");
  await expect(reviewColumn.getByTestId("card-card-1")).toBeVisible();
});

test("persists added, edited, moved cards and renamed columns across reload", async ({ page }) => {
  await loginUser(page);

  const backlog = page.getByTestId("column-col-backlog");
  await backlog.getByRole("button", { name: /add a card/i }).click();
  await backlog.getByPlaceholder("Card title").fill("Persisted card");
  await backlog.getByPlaceholder("Details").fill("Survives reload.");
  await backlog.getByRole("button", { name: /add card/i }).click();

  const card = page.getByTestId("card-card-1");
  await card.getByRole("button", { name: /^edit /i }).click();
  await card.getByLabel("Edit card title").fill("Edited title");
  await card.getByLabel("Edit card details").fill("Edited details");
  await card.getByRole("button", { name: /save/i }).click();

  await dragCardToColumn(page, "card-1", "col-progress");

  const progress = page.getByTestId("column-col-progress");
  await progress.getByLabel("Column title").fill("Active Development");
  await progress.getByLabel("Column title").press("Enter");
  await expect(page.getByTestId("save-status")).toHaveText("Saved");

  await page.reload();
  await expect(backlog.getByText("Persisted card")).toBeVisible();
  await expect(backlog.getByText("Survives reload.")).toBeVisible();
  await expect(progress.getByTestId("card-card-1")).toContainText("Edited title");
  await expect(progress.getByTestId("card-card-1")).toContainText("Edited details");
  await expect(progress.getByLabel("Column title")).toHaveValue("Active Development");
});

test("AI chat creates a card that appears on the board and persists", async ({ page }) => {
  await loginUser(page);
  await page.getByRole("button", { name: "Open AI chat" }).click();
  await page.getByTestId("chat-input").fill(
    "Create a card called 'Release v1.0' in the Review column with details 'Ready for signoff'."
  );
  await page.getByTestId("send-button").click();

  const review = page.getByTestId("column-col-review");
  await expect(review.getByText("Release v1.0")).toBeVisible({ timeout: 45_000 });
  await expect(review.getByText("Ready for signoff")).toBeVisible();
  await expect(page.getByTestId("chat-messages")).not.toContainText("Thinking...");

  await page.reload();
  await expect(review.getByText("Release v1.0")).toBeVisible();
});
