# HDS-BRAIN Reference Boundary

Phase 12-S0 locks the difference between reference material and authority.

## Reference Sources

The following may be referenced as context, evidence, replay material, or display material:

- memory
- complete history
- session history
- tool result
- LLM output
- channel metadata
- plugin metadata
- external metadata
- audit viewer projection
- Control Center projection

They must not become authority.

## Allowed Uses

- context/reference
- audit evidence
- replay input
- display
- operator review material

All of these keep `used_for_authority=false`.

## Forbidden Uses

- authority decision
- risk classification
- approval substitution
- privilege escalation
- final-review bypass
- policy rewrite
- actor/process override

If a source attempts to move from reference to authority, HDS-BRAIN must suspend or require L3 final review. The downstream material itself still remains non-authority.

## Runtime Rule

The next authority decision always returns to HDS-BRAIN:

```text
HDS-BRAIN
  -> command envelope
  -> downstream limb
  -> result / feedback / event
  -> HDS-BRAIN audit / history / next decision
```

No downstream result may skip that loop.
