import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { exampleReview } from "../../src/lib/example";
import { reviewSchema } from "../../src/lib/domain";
import { validateAnalysis } from "../../src/lib/grounding";

async function checkPanel(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}

test("example sources and schema are valid", () => {
  expect(reviewSchema.safeParse(exampleReview).success).toBe(true);
  expect(
    validateAnalysis(exampleReview.analysis, exampleReview.versions[0])
      .findings,
  ).toHaveLength(4);
});

test("example review supports evidence, brief, comparison and scenario boundaries", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore an example" }).click();
  await expect(
    page
      .getByRole("heading", { name: "Brand identity agreement", exact: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional example.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "High priority", exact: true })
    .click();
  await expect(page.locator(".finding")).toHaveCount(2);
  await page
    .getByRole("button", { name: "For awareness", exact: true })
    .click();
  await expect(page.getByText("No findings in this category.")).toBeVisible();
  await page.getByRole("button", { name: "All findings", exact: true }).click();
  await page.getByRole("button", { name: "Original · p. 1, ¶ 2" }).click();
  await expect(page.locator(".source-paragraph.highlight")).toContainText(
    "sole discretion",
  );
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Findings", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Brief", exact: true })
    .first()
    .check();
  await page.getByRole("button", { name: "Prepare brief (1)" }).click();
  await expect(page.getByLabel("Edit negotiation brief")).toHaveValue(
    /seven-day acceptance/,
  );
  await page
    .getByLabel("Edit negotiation brief")
    .fill("My edited negotiation brief.");
  await expect(page.getByRole("button", { name: "Save brief" })).toBeDisabled();
  await checkPanel(page);
  await page.getByRole("tab", { name: "Compare" }).click();
  await page.getByRole("button", { name: "Add revision" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Sign in" }),
  ).toBeVisible();
  await checkPanel(page);
  await page.getByRole("tab", { name: "Scenarios" }).click();
  await page.getByLabel("Total agreed fee (INR)").fill("80000");
  await page.getByLabel("Amount already paid (INR)").fill("20000");
  await page.getByLabel("Work completed (%)").fill("50");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Explore scenario" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "read-only" }),
  ).toBeVisible();
  await checkPanel(page);
  await page.getByRole("tab", { name: "Review" }).click();
  await page
    .getByRole("textbox", { name: "Your question" })
    .fill("What if the client cancels?");
  await page.getByRole("button", { name: "Ask question" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Sign in to ask a live question" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Review" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({
    path: `artifacts/review-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("entry and example review meet automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Explore an example" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("unconfigured live analysis never returns a fabricated result", async ({
  request,
}) => {
  const response = await request.post(
    "/api/reviews/00000000-0000-4000-8000-000000000001/analyze",
    { data: {} },
  );
  expect([401, 503]).toContain(response.status());
  expect(await response.json()).toHaveProperty("error");
});
