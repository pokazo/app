import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { SPEECH_JSON, SpeechDoc, parseSpeechJson, type SpeechDocT } from "./speech.js";

export type SpeechGetResult = { status: "missing" } | SpeechDocT;

export async function readSpeechResponse(dir: string): Promise<SpeechGetResult> {
  const path = join(dir, SPEECH_JSON);
  if (!existsSync(path)) return { status: "missing" };
  try {
    return parseSpeechJson(await readFile(path, "utf8"));
  } catch {
    return { status: "missing" };
  }
}

export async function writeSpeechDoc(dir: string, body: unknown): Promise<SpeechDocT> {
  const doc = SpeechDoc.parse(body);
  await writeFile(join(dir, SPEECH_JSON), JSON.stringify(doc, null, 2), "utf8");
  return doc;
}

export function isSpeechMissingResult(v: SpeechGetResult): v is { status: "missing" } {
  return "status" in v && v.status === "missing";
}
