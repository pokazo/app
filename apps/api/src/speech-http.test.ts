import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSpeechResponse, writeSpeechDoc } from "./speech-http.js";
import { SPEECH_JSON } from "./speech.js";

describe("readSpeechResponse", () => {
  it("returns missing when no file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-speech-http-"));
    expect(await readSpeechResponse(dir)).toEqual({ status: "missing" });
  });

  it("returns parsed doc when present", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-speech-http-"));
    const doc = {
      slides: [{ index: 1, heading: "H", theses: "t", speech: "s" }],
    };
    writeFileSync(join(dir, SPEECH_JSON), JSON.stringify(doc));
    expect(await readSpeechResponse(dir)).toEqual(doc);
  });
});

describe("writeSpeechDoc", () => {
  it("writes valid body", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-speech-http-"));
    const doc = {
      slides: [{ index: 1, heading: "H", theses: "t", speech: "s" }],
    };
    const out = await writeSpeechDoc(dir, doc);
    expect(out).toEqual(doc);
    expect(await readSpeechResponse(dir)).toEqual(doc);
  });

  it("rejects empty speech", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pokazo-speech-http-"));
    await expect(
      writeSpeechDoc(dir, {
        slides: [{ index: 1, heading: "H", theses: "t", speech: "  " }],
      }),
    ).rejects.toThrow();
  });
});
