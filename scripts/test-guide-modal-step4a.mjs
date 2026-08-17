/**
 * STEP 4-A modal verification + screenshots
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const OUT = path.join("screenshots", "phase2-step4a-modal");
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:8765/tools/realestate-map/";

async function dismissWelcome(page) {
  await page.evaluate(() => {
    const el = document.getElementById("map-empty-state");
    if (el) el.hidden = true;
  });
}

async function selectSeoulGangnam(page) {
  await page.waitForFunction(() => document.getElementById("nativeGuSelect")?.options?.length > 1, {
    timeout: 30000,
  });
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const sido = document.getElementById("nativeSidoSelect");
    const o = [...sido.options].find((x) => x.text.includes("서울"));
    if (o) {
      sido.value = o.value;
      sido.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await wait(3000);
    const sig = document.getElementById("nativeGuSelect");
    if (sig) {
      const g = [...sig.options].find((x) => x.text.includes("강남"));
      if (g) {
        sig.value = g.value;
        sig.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    await wait(15000);
  });
}

async function runDesktop() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  await dismissWelcome(page);
  await selectSeoulGangnam(page);

  const mapInfo = await page.evaluate(() => ({
    mapH: document.getElementById("map")?.getBoundingClientRect().height,
    markerCount: document.getElementById("marker-count")?.textContent?.trim(),
    triggerRect: document.getElementById("guide-modal-trigger")?.getBoundingClientRect(),
    hasCanvas: !!document.querySelector("#map canvas"),
    sigungu: document.getElementById("nativeGuSelect")?.selectedOptions?.[0]?.text,
    selectedGu: document.getElementById("selectedGu")?.textContent?.trim(),
  }));

  await page.screenshot({ path: path.join(OUT, "map-with-trigger.png") });

  await page.click("#guide-modal-trigger");
  await page.waitForTimeout(400);
  const modalOpen = await page.evaluate(
    () => document.getElementById("guide-modal")?.style.display === "flex"
  );
  await page.screenshot({ path: path.join(OUT, "modal-top.png") });

  await page.evaluate(() => {
    const modal = document.getElementById("guide-modal");
    const inner = modal?.querySelector("div");
    const faq = [...(inner?.querySelectorAll("h3") || [])].find((h) =>
      h.textContent?.includes("자주 묻는 질문")
    );
    if (inner && faq) inner.scrollTop = faq.offsetTop - 20;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "modal-faq.png") });

  await page.click("#guide-modal-close");
  const closedX = await page.evaluate(
    () => document.getElementById("guide-modal")?.style.display === "none"
  );

  await page.click("#guide-modal-trigger");
  await page.locator("#guide-modal").click({ position: { x: 10, y: 10 } });
  const closedBackdrop = await page.evaluate(
    () => document.getElementById("guide-modal")?.style.display === "none"
  );

  await page.click("#guide-modal-trigger");
  await page.keyboard.press("Escape");
  const closedEsc = await page.evaluate(
    () => document.getElementById("guide-modal")?.style.display === "none"
  );

  const mapBox = await page.locator("#map").boundingBox();
  if (mapBox) {
    await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(mapBox.x + mapBox.width / 2 - 80, mapBox.y + mapBox.height / 2 - 40);
    await page.mouse.up();
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(500);
  }
  const mapInteractive = await page.evaluate(() => !!document.querySelector("#map canvas"));

  await browser.close();
  return { mapInfo, modalOpen, closedX, closedBackdrop, closedEsc, mapInteractive, errors };
}

async function runMobile() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  await dismissWelcome(page);
  await page.click("#guide-modal-trigger");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, "modal-mobile.png") });
  await browser.close();
}

const desktop = await runDesktop();
await runMobile();
console.log(JSON.stringify(desktop, null, 2));
