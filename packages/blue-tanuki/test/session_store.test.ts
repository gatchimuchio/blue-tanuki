import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  MemorySessionStore,
  JsonFileSessionStore,
} from "../src/sessions/index.js";
import type { ChatMessage, SessionStore } from "../src/sessions/index.js";

function msg(role: ChatMessage["role"], content: string, t = Date.now()): ChatMessage {
  return { role, content, timestamp: t };
}

/** Shared contract suite — both stores must pass these. */
function contractSuite(name: string, factory: () => SessionStore | Promise<SessionStore>) {
  describe(`SessionStore contract — ${name}`, () => {
    let store: SessionStore;
    beforeEach(async () => {
      store = await factory();
    });

    it("returns [] for unknown session", async () => {
      const got = await store.getMessages("absent");
      expect(got).toEqual([]);
    });

    it("appends and reads back in chronological order", async () => {
      await store.append("s1", msg("user", "hello", 1));
      await store.append("s1", msg("assistant", "hi", 2));
      await store.append("s1", msg("user", "again", 3));
      const got = await store.getMessages("s1");
      expect(got.map((m) => m.content)).toEqual(["hello", "hi", "again"]);
      expect(got.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    });

    it("isolates sessions by id", async () => {
      await store.append("s1", msg("user", "a"));
      await store.append("s2", msg("user", "b"));
      const a = await store.getMessages("s1");
      const b = await store.getMessages("s2");
      expect(a.map((m) => m.content)).toEqual(["a"]);
      expect(b.map((m) => m.content)).toEqual(["b"]);
    });

    it("limit returns the most recent N in chronological order", async () => {
      for (let i = 0; i < 5; i++) {
        await store.append("s", msg("user", String(i), i));
      }
      const got = await store.getMessages("s", { limit: 2 });
      expect(got.map((m) => m.content)).toEqual(["3", "4"]);
    });

    it("clear removes a session", async () => {
      await store.append("s1", msg("user", "a"));
      await store.append("s2", msg("user", "b"));
      await store.clear("s1");
      expect(await store.getMessages("s1")).toEqual([]);
      expect((await store.getMessages("s2")).map((m) => m.content)).toEqual(["b"]);
    });

    it("clear of unknown session is a no-op (idempotent)", async () => {
      await expect(store.clear("absent")).resolves.toBeUndefined();
    });

    it("size reflects distinct sessions with content", async () => {
      expect(await store.size()).toBe(0);
      await store.append("s1", msg("user", "a"));
      await store.append("s2", msg("user", "b"));
      expect(await store.size()).toBe(2);
      await store.clear("s1");
      expect(await store.size()).toBe(1);
    });
  });
}

contractSuite("MemorySessionStore", () => new MemorySessionStore({ cap: 100 }));

describe("MemorySessionStore — eviction & cap", () => {
  it("evicts oldest when cap is exceeded", async () => {
    const s = new MemorySessionStore({ cap: 3 });
    for (let i = 0; i < 5; i++) {
      await s.append("k", msg("user", String(i), i));
    }
    const got = await s.getMessages("k");
    expect(got.map((m) => m.content)).toEqual(["2", "3", "4"]);
  });

  it("cap=0 disables history; getMessages always returns []", async () => {
    const s = new MemorySessionStore({ cap: 0 });
    await s.append("k", msg("user", "x"));
    expect(await s.getMessages("k")).toEqual([]);
    expect(await s.size()).toBe(0);
  });

  it("rejects invalid cap", () => {
    expect(() => new MemorySessionStore({ cap: -1 })).toThrow();
    expect(() => new MemorySessionStore({ cap: NaN })).toThrow();
  });

  it("append rejects empty session_id", async () => {
    const s = new MemorySessionStore();
    await expect(s.append("", msg("user", "x"))).rejects.toThrow(/session_id/);
  });

  it("getMessages returns defensive copies (mutation-safe)", async () => {
    const s = new MemorySessionStore();
    await s.append("k", msg("user", "a", 1));
    const got = await s.getMessages("k");
    got[0].content = "mutated";
    const again = await s.getMessages("k");
    expect(again[0].content).toBe("a");
  });
});

describe("JsonFileSessionStore — file backend specifics", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-sess-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("creates base_dir if missing", async () => {
    const sub = path.join(dir, "deep", "nested");
    new JsonFileSessionStore({ base_dir: sub });
    const stat = await fs.stat(sub);
    expect(stat.isDirectory()).toBe(true);
  });

  it("persists across instances on the same dir", async () => {
    const a = new JsonFileSessionStore({ base_dir: dir });
    await a.append("s", msg("user", "first", 1));
    await a.append("s", msg("assistant", "second", 2));
    const b = new JsonFileSessionStore({ base_dir: dir });
    const got = await b.getMessages("s");
    expect(got.map((m) => m.content)).toEqual(["first", "second"]);
  });

  it("encodes non-ASCII session_id safely on disk", async () => {
    const s = new JsonFileSessionStore({ base_dir: dir });
    const sid = "slack:U日本語";
    await s.append(sid, msg("user", "こんにちは", 1));
    const got = await s.getMessages(sid);
    expect(got[0].content).toBe("こんにちは");
    // Filename on disk must not contain : or /
    const files = await fs.readdir(dir);
    expect(files.length).toBe(1);
    expect(files[0]).not.toContain(":");
    expect(files[0]).not.toContain("/");
  });

  it("skips malformed lines without crashing", async () => {
    const s = new JsonFileSessionStore({ base_dir: dir });
    await s.append("k", msg("user", "valid", 1));
    // Inject a garbage line directly to the file
    const files = await fs.readdir(dir);
    const file = path.join(dir, files[0]);
    await fs.appendFile(file, "this is not json\n", "utf8");
    await s.append("k", msg("assistant", "after", 2));
    const got = await s.getMessages("k");
    expect(got.map((m) => m.content)).toEqual(["valid", "after"]);
  });

  it("size() counts only well-named files", async () => {
    const s = new JsonFileSessionStore({ base_dir: dir });
    await s.append("a", msg("user", "x"));
    await s.append("b", msg("user", "y"));
    // Drop an unrelated file in the dir to ensure it's ignored
    await fs.writeFile(path.join(dir, "README.txt"), "noise", "utf8");
    expect(await s.size()).toBe(2);
  });

  it("respects cap on read even when file grew past cap", async () => {
    // cap=3; pre-seed the file with 6 lines bypassing append.
    const s = new JsonFileSessionStore({ base_dir: dir, cap: 3 });
    await s.append("k", msg("user", "warmup", 0));
    const files = await fs.readdir(dir);
    const file = path.join(dir, files[0]);
    let payload = "";
    for (let i = 1; i <= 5; i++) {
      payload += JSON.stringify(msg("user", `m${i}`, i)) + "\n";
    }
    await fs.appendFile(file, payload, "utf8");
    const got = await s.getMessages("k");
    // 6 lines on disk (warmup + 5), cap=3 → keep last 3.
    expect(got.map((m) => m.content)).toEqual(["m3", "m4", "m5"]);
  });
});

contractSuite("JsonFileSessionStore", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "btnk-sess-c-"));
  return new JsonFileSessionStore({ base_dir: dir, cap: 100 });
});
