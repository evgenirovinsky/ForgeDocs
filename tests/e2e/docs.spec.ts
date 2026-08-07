import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(
    process.env.AUTH_E2E_BYPASS === "true" ? "e2e-bypass" : "password123",
  );
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/documents");
}

test("editor can create a document", async ({ page }) => {
  await login(page, "alice@acme.test");
  await page.getByTestId("create-document").click();
  await page.waitForURL("**/documents/**");
  await expect(page.getByTestId("export-docx")).toBeVisible();
  await expect(page.getByRole("textbox").first()).toBeVisible();
});

test("viewer cannot patch documents via API", async ({ page }) => {
  await login(page, "bob@acme.test");
  await expect(page.getByTestId("create-document")).toHaveCount(0);

  const list = await page.request.get("/api/documents");
  expect(list.ok()).toBeTruthy();
  const { documents } = await list.json();
  expect(documents.length).toBeGreaterThan(0);

  const patch = await page.request.patch(`/api/documents/${documents[0].id}`, {
    data: { title: "Should fail" },
  });
  expect(patch.status()).toBe(403);
});

test("tenant isolation hides other tenant documents", async ({ page }) => {
  await login(page, "carol@globex.test");
  const rows = page.getByTestId("document-row");
  await expect(rows.first()).toBeVisible();
  const texts = await rows.allTextContents();
  expect(texts.join(" ")).toContain("Globex");
  expect(texts.join(" ")).not.toContain("Acme Handbook");
});
