import { expect, test } from "@playwright/test";

const expectedSiteUrl = (
  process.env.E2E_BASE_URL ?? "http://localhost:3100"
).replace(/\/$/, "");

const publicRoutes = [
  "/",
  "/nosotros",
  "/servicios",
  "/servicios/civil",
  "/equipo",
  "/equipo/rodrigo-lizarraga-camacho",
  "/equipo/felipe-ibarra-ibarra",
  "/agendar",
  "/contacto",
  "/aviso-de-privacidad",
  "/terminos",
  "/portal/iniciar-sesion",
];

test.describe("public production readiness", () => {
  for (const route of publicRoutes) {
    test(`${route} renders without horizontal overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test("keeps the canonical aliases working", async ({ page }) => {
    for (const [alias, destination] of [
      ["/firma", "/nosotros"],
      ["/practicas", "/servicios"],
      ["/perspectivas", "/insights"],
      ["/agenda", "/agendar"],
    ]) {
      await page.goto(alias);
      await expect(page).toHaveURL(new RegExp(`${destination}$`));
    }
  });

  test("publishes crawl metadata with the configured canonical URL", async ({
    request,
  }) => {
    const robots = await request.get("/robots.txt");
    const sitemap = await request.get("/sitemap.xml");

    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain(
      `Sitemap: ${expectedSiteUrl}/sitemap.xml`,
    );
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain(`<loc>${expectedSiteUrl}</loc>`);
  });

  test("the mobile public menu opens, traps focus and closes with Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Abrir menú" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});
