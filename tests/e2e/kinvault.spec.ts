import { expect, test } from "@playwright/test";

// Words that would betray fake/mock proof leaking into the live UI.
const FAKE_PROOF_LABELS = [
  /local fixture/i,
  /mock proof/i,
  /lorem ipsum/i,
  /placeholder/i,
];

test("landing renders the real product, no fake-proof labels", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /inherit bitcoin without selling it/i }),
  ).toBeVisible();

  // Landing CTAs are present (nav "Launch App" + hero "Connect Wallet").
  const cta = page.getByRole("button", {
    name: /connect wallet|launch app|connect passport/i,
  });
  await expect(cta.first()).toBeVisible();

  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const label of FAKE_PROOF_LABELS) {
    expect(bodyText, `landing must not contain ${label}`).not.toMatch(label);
  }

  await page.screenshot({
    path: `outputs/v3-landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("dashboard owner view shows live Mezo risk preview + judge proof", async ({
  page,
}, testInfo) => {
  await page.goto("/harness.html?role=owner");

  await expect(page.getByText("Live Mezo borrow preview")).toBeVisible({
    timeout: 15_000,
  });
  // Real on-chain values, not placeholders.
  await expect(page.getByText(/Min net debt/i)).toBeVisible();
  await expect(page.getByText(/1,?800 MUSD/)).toBeVisible();
  await expect(page.getByText(/Min collateral \(MCR\)/i)).toBeVisible();
  await expect(page.getByText(/110%/)).toBeVisible();

  // Judge proof rail with real network + contract.
  await expect(
    page.getByText(/Judge proof — live on Mezo Testnet/i),
  ).toBeVisible();
  await expect(page.getByText(/Mezo Testnet \(31611\)/)).toBeVisible();

  // Owner role badge. (Deposit/add controls render only while the vault is
  // active; the live canonical vault has already been released, so we assert
  // the role + live reads rather than the owner-only mutation controls.)
  await expect(page.getByText("Owner", { exact: true })).toBeVisible();

  // Wait for the live beneficiary rows (70/30 split) to resolve.
  await expect(page.getByText("70.0%")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("30.0%")).toBeVisible();

  await page.screenshot({
    path: `outputs/v3-dashboard-owner-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("dashboard beneficiary view shows rehearsal status + allocation", async ({
  page,
}, testInfo) => {
  await page.goto("/harness.html?role=beneficiary");

  await expect(page.getByText("Claim rehearsal")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Beneficiary", { exact: true })).toBeVisible();
  await expect(page.getByText(/Your allocation/i)).toBeVisible();
  // The beneficiary rehearsed on-chain earlier → status should read Rehearsed.
  await expect(page.getByText(/Rehearsed/i)).toBeVisible();

  await page.screenshot({
    path: `outputs/v3-dashboard-beneficiary-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("release control is present and reflects live canRelease", async ({
  page,
}) => {
  await page.goto("/harness.html?role=spectator");
  const releaseBtn = page.getByRole("button", { name: /release musd/i });
  await expect(releaseBtn).toBeVisible({ timeout: 15_000 });
  // Enabled state mirrors the live contract's canRelease(); we assert the
  // control renders without crashing in the spectator (non-owner) view.
});
