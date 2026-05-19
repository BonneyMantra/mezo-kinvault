import { expect, test } from "@playwright/test";

test("auth boundary is explicit when Passport credentials are absent", async ({ page }, testInfo) => {
  await page.goto("/");

  const passportButton = page.getByRole("button", { name: /passport config needed/i });
  await expect(passportButton).toBeVisible();
  await expect(passportButton).toBeDisabled();
  await expect(page.getByText("local fixture", { exact: true })).toBeVisible();
  await expect(page.getByText(/repo creation blocked until submitter is selected/i)).toBeVisible();

  await page.screenshot({ path: `outputs/readiness-auth-blocked-${testInfo.project.name}.png`, fullPage: true });
});

test("primary beneficiary release path and blocked early-release state work", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByText("Beneficiary release is blocked")).toBeVisible();
  await expect(page.getByRole("button", { name: /release reserve/i })).toBeDisabled();

  await page.getByRole("button", { name: /simulate missed heartbeat/i }).click();
  await expect(page.getByText("Beneficiary release is now allowed")).toBeVisible();
  await expect(page.getByRole("button", { name: /release reserve/i })).toBeEnabled();
  await page.screenshot({ path: `outputs/readiness-ready-state-${testInfo.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: /release reserve/i }).click();
  await expect(page.getByText("Beneficiary received emergency MUSD")).toBeVisible();
  await expect(page.getByText("Reserve released")).toBeVisible();

  await page.getByRole("button", { name: /record heartbeat/i }).click();
  await expect(page.getByText("Beneficiary release is blocked")).toBeVisible();
  await expect(page.getByRole("button", { name: /release reserve/i })).toBeDisabled();
});

test("visible links resolve to real local or external targets", async ({ page, request }) => {
  await page.goto("/");

  const expectedLinks = [
    { name: "KinVault home", href: "/", alwaysVisible: true },
    { name: "Mezo docs", href: "https://mezo.org/docs/developers/getting-started/" },
    { name: "Testnet explorer", href: "https://explorer.test.mezo.org/" },
    { name: "Proof JSON", href: "./outputs/proofs/latest.json" },
    { name: "Sponsor brief", href: "https://mezo.org/blog/the-mezo-hackathon-is-back/", alwaysVisible: true },
  ];

  const isMobileNavHidden = (page.viewportSize()?.width ?? 1440) <= 860;
  for (const link of expectedLinks) {
    const locator = page.getByRole("link", { name: link.name });
    if (link.alwaysVisible || !isMobileNavHidden) {
      await expect(locator).toHaveAttribute("href", link.href);
      await expect(locator).toBeVisible();
    }
    const response = await request.get(link.href);
    expect(response.status(), `${link.name} status`).toBeLessThan(400);
  }
});
