import { expect, test } from "@playwright/test";

// Proves the BROWSER WRITE path end-to-end against the live Mezo Testnet:
// real <Dashboard> button -> wagmi useWriteContract -> eth_sendTransaction
// (signed by the test signer) -> Mezo RPC -> mined -> "Confirmed" in the UI.
// Requires VITE_TEST_SIGNER_KEY / VITE_TEST_BENE_KEY and the app pointed at an
// ACTIVE (unreleased) vault. Run explicitly:
//   npx playwright test tests/e2e/browser-write.spec.ts --project=desktop-1440

test("owner can record a heartbeat from the browser UI", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/harness-signer.html?role=owner");

  const heartbeatBtn = page.getByRole("button", { name: /heartbeat/i });
  await expect(heartbeatBtn).toBeVisible({ timeout: 20_000 });
  await expect(heartbeatBtn).toBeEnabled();

  await heartbeatBtn.click();
  // Dashboard sets txStatus "Recording heartbeat..." then "Confirmed" on receipt.
  await expect(page.getByText("Confirmed")).toBeVisible({ timeout: 60_000 });

  await page.screenshot({
    path: "outputs/v3-browser-write-heartbeat.png",
    fullPage: true,
  });
});

test("beneficiary can rehearse a claim from the browser UI", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/harness-signer.html?role=beneficiary");

  const rehearseBtn = page.getByRole("button", { name: /rehearse/i });
  await expect(rehearseBtn).toBeVisible({ timeout: 20_000 });
  await rehearseBtn.click();
  await expect(page.getByText("Confirmed")).toBeVisible({ timeout: 60_000 });

  await page.screenshot({
    path: "outputs/v3-browser-write-rehearse.png",
    fullPage: true,
  });
});
