import { expect, test } from "@playwright/test";

test("processes a document through the workbench", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Document intake console" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Star on GitHub/ }),
  ).toHaveAttribute(
    "href",
    "https://github.com/baditaflorin/universal-document-workbench",
  );
  await expect(page.getByRole("link", { name: /PayPal/ })).toHaveAttribute(
    "href",
    "https://www.paypal.com/paypalme/florinbadita",
  );

  await page.getByLabel("Choose document").setInputFiles({
    name: "sample.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Florin met Ada Lovelace in Bucharest on 8 May 2026."),
  });
  await page.getByRole("button", { name: "Process" }).click();
  await expect(page.getByText("Unknown document")).toBeVisible();
  await expect(page.getByText("document shape")).toBeVisible();
  await page.getByRole("tab", { name: "Entities" }).click();
  await expect(page.getByRole("cell", { name: "Ada Lovelace" })).toBeVisible();
  await page.getByRole("tab", { name: "Exports" }).click();
  await expect(page.getByRole("button", { name: /markdown/i })).toBeVisible();
});
