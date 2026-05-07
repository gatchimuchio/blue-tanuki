function normalizeName(name) {
    return name.trim().toLowerCase();
}
/**
 * Runtime-selectable backend registry.
 *
 * The registry itself implements LLMBackend so Executor can keep depending on
 * one narrow interface. HDS-BRAIN may attach backend_hint to a command; the
 * registry then resolves that hint to a concrete downstream provider.
 */
export class LLMRegistry {
    name = "registry";
    backends = new Map();
    primaryNames = new Set();
    defaultName;
    constructor(defaultName) {
        this.defaultName = defaultName ? normalizeName(defaultName) : undefined;
    }
    register(backend, aliases = []) {
        const primary = normalizeName(backend.name);
        if (!primary) {
            throw new Error("LLMRegistry: backend name is required");
        }
        this.backends.set(primary, backend);
        this.primaryNames.add(primary);
        for (const alias of aliases) {
            const key = normalizeName(alias);
            if (key)
                this.backends.set(key, backend);
        }
        if (!this.defaultName)
            this.defaultName = primary;
        return this;
    }
    setDefault(name) {
        const key = normalizeName(name);
        if (!this.backends.has(key)) {
            throw new Error(`LLMRegistry: default backend '${name}' is not registered; available=${this.list().join(", ")}`);
        }
        this.defaultName = key;
        return this;
    }
    list() {
        return Array.from(this.primaryNames).sort();
    }
    resolve(hint) {
        const key = normalizeName(hint ?? this.defaultName ?? "");
        if (!key) {
            throw new Error("LLMRegistry: no default backend configured");
        }
        const backend = this.backends.get(key);
        if (!backend) {
            throw new Error(`LLMRegistry: backend '${hint ?? key}' is not registered; available=${this.list().join(", ")}`);
        }
        return backend;
    }
    async call(req) {
        const backend = this.resolve(req.backend_hint);
        return await backend.call({
            ...req,
            backend_hint: undefined,
        });
    }
}
//# sourceMappingURL=registry.js.map