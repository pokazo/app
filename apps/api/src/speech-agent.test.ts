import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { generateSpeechForDeck } from "./speech-agent.js";
import { SPEECH_JSON } from "./speech.js";

describe("generateSpeechForDeck", () => {
  it("writes speech.json from generateObject result", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-speech-"));
    const doc = {
      slides: [{ index: 1, heading: "H", theses: "t1", speech: "full talk" }],
    };
    const generateObjectFn = vi.fn(async () => ({ object: doc }));
    const out = await generateSpeechForDeck({
      workDir: dir,
      outline: { title: "T", slides: [{ heading: "H" }] },
      locale: "ru",
      slidesMd: "# T\n",
      generateObjectFn,
      modelId: "test-model",
    });
    expect(out.slides[0].speech).toBe("full talk");
    expect(JSON.parse(readFileSync(join(dir, SPEECH_JSON), "utf8"))).toEqual(doc);
    expect(generateObjectFn).toHaveBeenCalled();
  });
});
