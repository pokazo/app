import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_OPENAI_IMAGE_MODEL,
  generateOpenAiImageToPublic,
} from "./assets-openai-image.js";

describe("generateOpenAiImageToPublic", () => {
  it("writes b64 image under public/ with cheap defaults", async () => {
    const workDir = mkdtempSync(join(tmpdir(), "pokazo-gen-"));
    const pngBytes = Buffer.from([137, 80, 78, 71]);
    const fetchMock = vi.fn(async () =>
      Response.json({
        data: [{ b64_json: pngBytes.toString("base64") }],
      }),
    );
    const result = await generateOpenAiImageToPublic({
      workDir,
      prompt: "UAZ Patriot 2026 dark SUV front view showroom",
      filename: "slide-2-gen.png",
      apiKey: "sk-test",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(result.path).toBe("/slide-2-gen.png");
    expect(result.attribution).toEqual({
      source: "openai",
      model: DEFAULT_OPENAI_IMAGE_MODEL,
      prompt: "UAZ Patriot 2026 dark SUV front view showroom",
    });
    const written = await readFile(join(workDir, "public", "slide-2-gen.png"));
    expect([...written]).toEqual([137, 80, 78, 71]);

    const body = JSON.parse(String(fetchMock.mock.calls.at(0)?.[1]?.body ?? "{}")) as {
      model: string;
      quality: string;
      size: string;
    };
    expect(body.model).toBe("gpt-image-1-mini");
    expect(body.quality).toBe("low");
    expect(body.size).toBe("1536x1024");
  });

  it("rejects unsafe filename", async () => {
    await expect(
      generateOpenAiImageToPublic({
        workDir: "/tmp/deck",
        prompt: "x",
        filename: "../evil.png",
        apiKey: "sk",
        fetchImpl: async () => Response.json({ data: [] }),
      }),
    ).rejects.toThrow(/unsafe/i);
  });

  it("throws when api key missing", async () => {
    await expect(
      generateOpenAiImageToPublic({
        workDir: "/tmp/deck",
        prompt: "x",
        filename: "a.png",
        apiKey: "",
      }),
    ).rejects.toThrow(/OPENAI_API_KEY/i);
  });

  it("throws on non-OK API response", async () => {
    await expect(
      generateOpenAiImageToPublic({
        workDir: mkdtempSync(join(tmpdir(), "pokazo-gen-")),
        prompt: "x",
        filename: "a.png",
        apiKey: "sk",
        fetchImpl: async () =>
          Response.json({ error: { message: "billing hard limit" } }, { status: 400 }),
      }),
    ).rejects.toThrow(/billing hard limit/);
  });
});
