import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyPokazoCredit } from "./pokazo-credit.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  buildSlidev: vi.fn(async () => {}),
  tryRender: vi.fn(async () => {}),
  deckDataDir: "",
}));

vi.mock("./migrate.js", () => ({
  pool: { query: mocks.query },
}));

vi.mock("./env.js", () => ({
  config: {
    get deckDataDir() {
      return mocks.deckDataDir;
    },
  },
}));

vi.mock("./slidev.js", () => ({
  buildSlidev: mocks.buildSlidev,
  deckServeBase: (id: string) => `/p/${id}/`,
}));

vi.mock("./deck-thumbs.js", () => ({
  tryRenderDeckFilmstripThumbs: mocks.tryRender,
}));

vi.mock("./billing.js", () => ({
  billingLog: vi.fn(),
}));

import { stripPokazoCreditsAfterPayment } from "./pokazo-credit-strip.js";

const SAMPLE = `---
theme: default
---

---
layout: hero
variant: ribbon
---

# Hero

---
layout: fact
---

# End
`;

describe("stripPokazoCreditsAfterPayment", () => {
  let root = "";

  beforeEach(async () => {
    vi.clearAllMocks();
    root = await mkdtemp(join(tmpdir(), "pokazo-strip-"));
    mocks.deckDataDir = root;
  });

  afterEach(async () => {
    /* temp dirs cleaned by OS */
  });

  it("strips credit from free decks and rebuilds", async () => {
    const deckId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const dir = join(root, deckId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "slides.md"), applyPokazoCredit(SAMPLE, true), "utf8");

    mocks.query.mockResolvedValue({
      rows: [{ id: deckId }],
    });

    const n = await stripPokazoCreditsAfterPayment("user-1");
    expect(n).toBe(1);
    const md = await readFile(join(dir, "slides.md"), "utf8");
    expect(md).not.toContain("data-pk-credit");
    expect(mocks.buildSlidev).toHaveBeenCalledWith(dir, `/p/${deckId}/`);
    expect(mocks.tryRender).toHaveBeenCalled();
  });

  it("skips decks that already have no credit", async () => {
    const deckId = "aaaaaaaa-bbbb-cccc-dddd-ffffffffffff";
    const dir = join(root, deckId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "slides.md"), SAMPLE, "utf8");
    mocks.query.mockResolvedValue({ rows: [{ id: deckId }] });

    const n = await stripPokazoCreditsAfterPayment("user-1");
    expect(n).toBe(0);
    expect(mocks.buildSlidev).not.toHaveBeenCalled();
  });
});
