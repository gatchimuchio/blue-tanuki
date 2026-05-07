import { promises as fs } from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import type {
  ChatMessage,
  GetMessagesOptions,
  SessionStore,
} from "./types.js";

export interface JsonFileSessionStoreOptions {
  /** Directory where per-session JSONL files live. Created if missing. */
  base_dir: string;
  /** Maximum messages retained per session. Default 100. cap===0 disables. */
  cap?: number;
}

/**
 * File-backed SessionStore. One JSONL file per session.
 *
 * File layout: ${base_dir}/${encoded_session_id}.jsonl
 *   - session_id may legitimately contain ":" (e.g. "slack:U123"). To keep
 *     the filename portable across OSes the id is URL-safe base64 encoded.
 *   - Each line is JSON.stringify(ChatMessage). Newlines in message
 *     content are escaped automatically by JSON.stringify.
 *
 * Concurrency model:
 *   - Append uses fs.appendFile with implicit OS-level write atomicity.
 *     Each line is one syscall and is small (well under PIPE_BUF on all
 *     supported platforms), so torn writes are not expected for the
 *     single-process, single-host gateway today.
 *   - cap eviction is done by reading-then-rewriting the file on each
 *     append once the line count exceeds `cap`. This is intentionally
 *     simple; a second-process appending concurrently could see one
 *     extra row briefly, but the next append from either side will
 *     re-truncate. Acceptable for Phase 4 single-process use.
 *   - When horizontal scaling lands (Phase 6+), this implementation will
 *     be replaced by a Redis or Postgres-backed store via the same
 *     SessionStore interface. The interface is the contract; this is one
 *     implementation.
 *
 * Boundary with HDS-BRAIN:
 *   - This store persists EXECUTOR conversation history only.
 *   - HDS-BRAIN's audit chain is a separate JSONL written by AuditLog.
 *   - The two MUST NOT share files or directories. See
 *     docs/persistence-boundary.md for the full responsibility split.
 */
export class JsonFileSessionStore implements SessionStore {
  private readonly base_dir: string;
  private readonly cap: number;
  /**
   * Per-session async lock chain. Serialises append/clear so the
   * read-modify-write window of cap eviction can't interleave with itself
   * in the same process. Cross-process safety is described in the class
   * doc above.
   */
  private readonly chains = new Map<string, Promise<unknown>>();

  constructor(opts: JsonFileSessionStoreOptions) {
    if (!opts.base_dir) {
      throw new Error("JsonFileSessionStore: base_dir is required");
    }
    this.base_dir = path.resolve(opts.base_dir);
    this.cap = opts.cap ?? 100;
    if (!Number.isFinite(this.cap) || this.cap < 0) {
      throw new Error("JsonFileSessionStore: cap must be a non-negative number");
    }
    if (!existsSync(this.base_dir)) {
      mkdirSync(this.base_dir, { recursive: true });
    }
  }

  /** URL-safe base64 of session_id, used as the file basename. */
  private fileFor(session_id: string): string {
    if (!session_id) {
      throw new Error("JsonFileSessionStore: session_id required");
    }
    const encoded = Buffer.from(session_id, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return path.join(this.base_dir, `${encoded}.jsonl`);
  }

  /** Decode a filename produced by fileFor() back to its session_id. */
  private sessionForFile(name: string): string | null {
    if (!name.endsWith(".jsonl")) return null;
    const base = name.slice(0, -".jsonl".length);
    const padded =
      base.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (base.length % 4)) % 4);
    try {
      return Buffer.from(padded, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  /** Run `fn` after any pending op for the same session has settled. */
  private serialize<T>(session_id: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.chains.get(session_id) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    // Store the swallowed-error variant so subsequent chains keep going
    // even if `next` rejects.
    const swallowed = next.catch(() => undefined);
    this.chains.set(session_id, swallowed);
    // Best-effort cleanup: drop the entry once settled, but only if no
    // newer op has chained on top (identity check against `swallowed`).
    swallowed.finally(() => {
      if (this.chains.get(session_id) === swallowed) {
        this.chains.delete(session_id);
      }
    });
    return next;
  }

  async append(session_id: string, message: ChatMessage): Promise<void> {
    if (this.cap === 0) return;
    return this.serialize(session_id, async () => {
      const file = this.fileFor(session_id);
      await fs.appendFile(file, JSON.stringify(message) + "\n", "utf8");
      // Evict oldest lines when over cap. Trigger only when we are likely
      // over to avoid read-rewrite on every append.
      const stat = await fs.stat(file).catch(() => null);
      // Cheap heuristic: trigger truncate when file size grows past
      // cap × 1024 bytes (a generous over-estimate for typical chat lines).
      // This avoids reading the file on every single append.
      if (stat && stat.size > this.cap * 1024) {
        await this.truncateToCap(file);
      }
    });
  }

  /** Reads the file, keeps last `cap` lines, rewrites atomically. */
  private async truncateToCap(file: string): Promise<void> {
    const text = await fs.readFile(file, "utf8").catch(() => "");
    const lines = text.split("\n").filter((l) => l.length > 0);
    if (lines.length <= this.cap) return;
    const kept = lines.slice(lines.length - this.cap);
    const tmp = file + ".tmp";
    await fs.writeFile(tmp, kept.join("\n") + "\n", "utf8");
    await fs.rename(tmp, file);
  }

  async getMessages(
    session_id: string,
    opts: GetMessagesOptions = {},
  ): Promise<ChatMessage[]> {
    const file = this.fileFor(session_id);
    const text = await fs.readFile(file, "utf8").catch(() => "");
    if (!text) return [];
    const lines = text.split("\n").filter((l) => l.length > 0);
    const parsed: ChatMessage[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (
          obj &&
          typeof obj === "object" &&
          typeof obj.role === "string" &&
          typeof obj.content === "string" &&
          typeof obj.timestamp === "number"
        ) {
          parsed.push(obj as ChatMessage);
        }
      } catch {
        // Skip malformed lines defensively. A corrupt line should not
        // break the whole session history.
      }
    }
    // Apply cap to read result as a defence in depth (in case the file
    // grew past cap between truncations).
    const capped =
      parsed.length > this.cap ? parsed.slice(parsed.length - this.cap) : parsed;
    if (opts.limit !== undefined && opts.limit < capped.length) {
      return capped.slice(capped.length - opts.limit);
    }
    return capped;
  }

  async clear(session_id: string): Promise<void> {
    return this.serialize(session_id, async () => {
      const file = this.fileFor(session_id);
      await fs.unlink(file).catch((e: NodeJS.ErrnoException) => {
        if (e.code !== "ENOENT") throw e;
      });
    });
  }

  async size(): Promise<number> {
    const entries = await fs.readdir(this.base_dir).catch(() => [] as string[]);
    let count = 0;
    for (const name of entries) {
      if (this.sessionForFile(name) !== null) count++;
    }
    return count;
  }
}
