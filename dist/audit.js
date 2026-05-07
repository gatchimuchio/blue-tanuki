import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
export class AuditLog {
    entries = [];
    filepath;
    constructor(opts = {}) {
        this.filepath = opts.filepath;
        if (this.filepath && existsSync(this.filepath)) {
            this.loadFromFile();
        }
        else if (this.filepath) {
            // Ensure parent directory exists, but do not create the file —
            // first append() will create it.
            const dir = dirname(this.filepath);
            if (dir && !existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        }
    }
    append(log) {
        const prev_hash = this.entries.length === 0
            ? "GENESIS"
            : this.entries[this.entries.length - 1].entry_hash;
        const index = this.entries.length;
        const entry_hash = this.computeHash(index, log, prev_hash);
        const entry = { index, log, prev_hash, entry_hash };
        this.entries.push(entry);
        if (this.filepath) {
            appendFileSync(this.filepath, JSON.stringify(entry) + "\n");
        }
        return entry;
    }
    /**
     * Verify the chain. Returns true iff all hashes are consistent.
     */
    verify() {
        let prev_hash = "GENESIS";
        for (const entry of this.entries) {
            const expected = this.computeHash(entry.index, entry.log, prev_hash);
            if (expected !== entry.entry_hash || entry.prev_hash !== prev_hash) {
                return false;
            }
            prev_hash = entry.entry_hash;
        }
        return true;
    }
    list() {
        return this.entries;
    }
    size() {
        return this.entries.length;
    }
    computeHash(index, log, prev_hash) {
        return createHash("sha256")
            .update(`${index}|${prev_hash}|${JSON.stringify(log)}`)
            .digest("hex");
    }
    loadFromFile() {
        if (!this.filepath)
            return;
        const raw = readFileSync(this.filepath, "utf8");
        const lines = raw.split("\n").filter((l) => l.trim().length > 0);
        for (const line of lines) {
            const parsed = JSON.parse(line);
            this.entries.push(parsed);
        }
        if (!this.verify()) {
            throw new Error(`AuditLog: chain verification failed on load from ${this.filepath}`);
        }
    }
}
//# sourceMappingURL=audit.js.map