import { test, expect, type Page } from "@playwright/test";

const person = {
  id: "11111111-1111-4111-8111-111111111111",
  full_name: "Ama Mensah",
  household_id: "22222222-2222-4222-8222-222222222222",
  sex: "F",
  date_of_birth: "1990-01-01",
  phone: "+233240000000",
  national_id: "NHS-1",
  notes: "Initial visit",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
};

const household = {
  id: "22222222-2222-4222-8222-222222222222",
  head_name: "Ama Mensah",
  house_no: "H-1",
  community_id: "33333333-3333-4333-8333-333333333333",
  address: "Northern Ghana",
  phone: "+233240000000",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
};

async function mockBackend(page: Page) {
  let conflictPending = false;
  let offlineMode = false;
  let personValue = person;

  await page.route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/token")) {
      const user = { id: "44444444-4444-4444-8444-444444444444", aud: "authenticated", role: "authenticated", email: "worker@example.test", created_at: "2026-01-01T00:00:00.000Z" };
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, exp: 4_000_000_000 })).toString("base64url");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: `${header}.${payload}.test`, refresh_token: "test-refresh", expires_in: 3600, expires_at: 4_000_000_000, token_type: "bearer", user }),
      });
    }
    if (url.includes("/user")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "44444444-4444-4444-8444-444444444444", aud: "authenticated", role: "authenticated", email: "worker@example.test", created_at: "2026-01-01T00:00:00.000Z" }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").pop();
    if (request.method() === "PATCH" && table === "persons") {
      if (offlineMode) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Offline" }) });
      personValue = { ...personValue, ...(request.postDataJSON() as Partial<typeof person>) };
      conflictPending = false;
      return route.fulfill({ status: 204, body: "" });
    }
    if (table === "user_roles") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ role: "chps_worker" }]) });
    if (table === "profiles") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ full_name: "Test Worker", facility: "Test CHPS", phone: null, avatar_url: null }]) });
    if (table === "communities") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "33333333-3333-4333-8333-333333333333", name: "Test Community" }]) });
    if (table === "households") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([household]) });
    if (table === "persons") {
      const response = conflictPending ? { ...personValue, updated_at: "2099-01-01T00:00:00.000Z", full_name: "Server value" } : personValue;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([response]) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill("worker@example.test");
  await page.getByLabel("Password").fill("test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Work saved on this device remains available")).toBeVisible();

  return {
    setConflict: () => { conflictPending = true; },
    setOfflineMode: (value: boolean) => { offlineMode = value; },
  };
}

test.describe("Phase 5 golden path", () => {
  test("loads dashboard and finds a locally cached person", async ({ page }) => {
    await mockBackend(page);
    await page.getByLabel("Find a person or household").fill("Ama Mensah");
    await page.getByLabel("Find a person or household").press("Enter");
    await expect(page).toHaveURL(/\/people\?q=Ama(?:%20|\+)Mensah/);
    await expect(page.getByText("Ama Mensah").first()).toBeVisible();
    await page.getByText("Ama Mensah").first().click();
    await expect(page.getByRole("heading", { name: "Ama Mensah" })).toBeVisible();
  });

  test("saves an edit offline, reloads it, reconnects, and resolves a conflict", async ({ page }) => {
    const backend = await mockBackend(page);
    await page.getByLabel("Find a person or household").fill("Ama Mensah");
    await page.getByLabel("Find a person or household").press("Enter");
    await page.getByText("Ama Mensah").first().click();
    await expect(page.getByLabel("Full name")).toHaveValue("Ama Mensah");

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Full name").fill("Ama Reloaded");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByLabel("Full name")).toHaveValue("Ama Reloaded");
    await page.reload();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill("worker@example.test");
    await page.getByLabel("Password").fill("test-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Work saved on this device remains available")).toBeVisible();
    await page.getByLabel("Find a person or household").fill("Ama Reloaded");
    await page.getByLabel("Find a person or household").press("Enter");
    await page.getByText("Ama Reloaded").first().click();
    await expect(page.getByLabel("Full name")).toHaveValue("Ama Reloaded");

    backend.setOfflineMode(true);
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Full name").fill("Ama Offline");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved locally · pending sync")).toBeVisible();
    await expect(page.getByText("pending", { exact: false }).first()).toBeVisible();

    backend.setConflict();
    backend.setOfflineMode(false);
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByText("Conflict requires review").first()).toBeVisible();
    await expect(page.getByText("Local changes")).toBeVisible();
    await expect(page.getByText("Server changes")).toBeVisible();
    await expect(page.getByText("localId", { exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: "Keep Local" }).click();
    await expect(page.getByRole("heading", { name: "Conflict requires review" })).toHaveCount(0);
  });
});
