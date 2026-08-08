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
  await login(page, "dave@acme.test");
  await page.getByTestId("create-document").click();
  await page.waitForURL("**/documents/**");
  await expect(page.getByTestId("export-docx")).toBeVisible();
  await expect(page.getByRole("textbox").first()).toBeVisible();
});

test("viewer cannot patch documents without an elevate grant", async ({
  page,
}) => {
  await login(page, "bob@acme.test");
  await expect(page.getByTestId("create-document")).toHaveCount(0);

  const list = await page.request.get("/api/documents");
  expect(list.ok()).toBeTruthy();
  const { documents } = await list.json();
  const draft = documents.find(
    (d: { title: string }) => d.title === "Acme Draft",
  );
  expect(draft).toBeTruthy();

  const patch = await page.request.patch(`/api/documents/${draft.id}`, {
    data: { title: "Should fail" },
  });
  expect(patch.status()).toBe(403);
});

test("viewer can patch a document with an editor elevate grant", async ({
  page,
}) => {
  await login(page, "bob@acme.test");

  const list = await page.request.get("/api/documents");
  const { documents } = await list.json();
  const handbook = documents.find(
    (d: { title: string }) => d.title === "Acme Handbook",
  );
  expect(handbook).toBeTruthy();

  const patch = await page.request.patch(`/api/documents/${handbook.id}`, {
    data: { title: "Acme Handbook (elevated)" },
  });
  expect(patch.status()).toBe(200);

  await page.goto(`/documents/${handbook.id}`);
  await expect(page.getByText("(read-only)")).toHaveCount(0);
  await expect(page.getByTestId("share-document")).toHaveCount(0);
});

test("document creator can manage grants via Share UI", async ({ page }) => {
  await login(page, process.env.DEFAULT_DEV_EMAIL || "alice@acme.test");
  const list = await page.request.get("/api/documents");
  const { documents } = await list.json();
  const draft = documents.find(
    (d: { title: string }) => d.title === "Acme Draft",
  );
  expect(draft).toBeTruthy();

  await page.goto(`/documents/${draft.id}`);
  await page.getByTestId("share-document").click();
  await expect(page.getByTestId("share-panel")).toBeVisible();
  await page.getByTestId("share-email").fill("bob@acme.test");
  await page.getByTestId("share-submit").click();
  await expect(page.getByTestId("grant-row")).toContainText("bob@acme.test");
});

test("tenant isolation hides other tenant documents", async ({ page }) => {
  await login(page, "carol@globex.test");
  const rows = page.getByTestId("document-row");
  await expect(rows.first()).toBeVisible();
  const texts = await rows.allTextContents();
  expect(texts.join(" ")).toContain("Globex");
  expect(texts.join(" ")).not.toContain("Acme Handbook");
});
