# Seed Protocol Build

**Status:** DRAFT — research/reasoning foundation, not production specification  
**Project:** Chrome_Extension_workflow  
**Workstream:** Scouter / Seed / Browser Discovery Runtime  
**Purpose:** Capture the current reasoning and agreements before implementation.

---

## 1. Core intent

The system is intended to study a website before building reliable automation for it.

The goal is not to assume that every website should immediately become a dedicated Chrome Extension. The preferred direction is:

```text
Scouter AI
  ↓
Seed Extension
  ↓
Browser / Website
  ↕
Persistent Local Runtime / Bridge
  ↓
Evidence + Site Profile + Adapter + Regression Knowledge
```

The Seed Extension is the browser-side arm of the **Scouter AI**. Scouter owns the reasoning, research protocol, experimentation strategy, code generation, debugging loop, verification loop, and decision-making.

Seed should therefore be treated as a **general-purpose browser capability substrate**, not as the intelligence layer.

---

## 2. Preferred abstraction

The stronger architecture hypothesis is:

> **Browser Discovery Runtime** discovers website behavior, produces capability evidence and Site Adapters, and only escalates to a dedicated extension when necessary.

The weaker hypothesis is:

> “One Seed Extension automatically turns every website into a corresponding production extension.”

That statement is too broad because different websites expose different interaction surfaces, permission requirements, lifecycle behavior, regulation boundaries, and reliability characteristics.

A more maintainable hierarchy is:

```text
Browser Discovery Runtime
  ├─ Scouter AI
  ├─ Seed Extension
  ├─ Local Runtime / Bridge
  ├─ Evidence Store
  ├─ Site Capability Profile
  ├─ Site Adapter
  └─ Dedicated Extension (only when justified)
```

---

## 3. What Seed should study

Seed should not stop at detecting buttons, inputs, or selectors. It should help Scouter infer the **behavioral model** of the website.

The discovery target includes:

1. **Site / application identity** — what product or application surface is active.
2. **Interaction archetype** — for example:
   - fetch / research;
   - task execution;
   - workflow orchestration;
   - communication;
   - artifact / file processing;
   - transaction / commit workflows.
3. **State machine** — e.g. `IDLE → READY → RUNNING → WAITING → DONE / FAILED`.
4. **Interaction primitives** — click, type, select, upload, download, popup, iframe, tab handoff, streaming, long-running generation, etc.
5. **Technical constraints** — SPA lifecycle, frames, workers, network behavior, browser permissions, auth state, failure modes.
6. **Regulation / provider boundaries** — researched independently from technical reach.

A single website may expose multiple workflow archetypes. Classification should therefore happen at the **workflow / application-surface level**, not only at the domain level.

---

## 4. Seed capability philosophy

Scouter is expected to discover progressively what can be controlled on a website. For that reason Seed should expose a broad capability surface across:

- content scripts / DOM;
- Chrome Extension APIs;
- `chrome.debugger` / available CDP domains;
- Accessibility and DOM snapshot signals;
- navigation / target / frame lifecycle;
- network observation and controlled interception where appropriate;
- uploads / downloads;
- screenshots and other evidence capture;
- browser storage and runtime signals;
- local filesystem / CLI / DB / scheduler through the Bridge/local runtime.

The architectural preference is **maximum capability availability in Seed**.

Research limitations, trial protocol, action ordering, approval rules, and stopping criteria belong primarily to **Scouter AI / skills**, rather than being encoded as website-specific policy inside Seed.

Seed should remain generic.

---

## 5. Capability checklist model

Scouter should progressively test the website and build a capability checklist.

Each capability moves through evidence-backed states rather than a simple unsupported yes/no guess.

Example lifecycle:

```text
UNKNOWN
→ OBSERVED
→ INFERRED
→ TRIAL_READY
→ PROVEN
→ STABLE
```

Example capability record:

```text
UPLOAD_FILE
- observable: PASS
- controllable: PASS
- micro-proof: PASS
- repeatable: PASS
- technical reach: PROVEN
- regulation boundary: CONSTRAINED / ALLOWED / NEEDS STUDY
- evidence: EV-018..EV-027
```

The checklist is intended to become a practical map of **what Scouter can reliably do on that website**.

A capability tick must be tied to observable evidence, not merely inferred from DOM labels, class names, or endpoint names.

---

## 6. Scouter autonomous build / debug / verification loop

The preferred workflow is a **single Scouter AI operating through multiple skills/modes**, rather than requiring two separate AIs to build and verify every change.

The core loop is:

```text
discover
→ hypothesize
→ generate code/config
→ reload / refresh runtime
→ trial
→ observe
→ diagnose
→ patch
→ retry
→ verify
→ record regression evidence
```

This is considered desirable because the same agent retains the complete local context and can iterate rapidly against the live browser.

Verification should still be evidence-driven. The same AI may verify its own implementation, but a verification skill should test observable outcomes against explicit criteria rather than accepting the previous reasoning as proof.

Each discovered bug should contribute:

```text
failure signature
→ diagnosis
→ counter-code / adapter rule
→ regression proof
```

Over time this can form a reusable library of browser/site patterns.

---

## 7. Separation of responsibilities

### Scouter AI

Owns:

- discovery strategy;
- reasoning;
- research protocols;
- trial sequencing;
- code/config generation;
- debugging;
- verification;
- regulation research;
- decisions to promote, retry, stop, or escalate.

### Seed Extension

Owns:

- generic browser observation;
- generic interaction primitives;
- Chrome / CDP access;
- evidence collection hooks;
- execution of commands from Scouter;
- reporting raw and normalized results.

Seed should **not accumulate provider-specific business logic**.

### Site Adapter

Owns:

- provider/site-specific selectors or semantic locators;
- workflow states and transitions;
- site-specific network fingerprints;
- provider-specific interaction recipes;
- validated counter-rules for known failure patterns;
- compatibility/version information.

### Local Runtime / Bridge

Owns generic infrastructure such as:

- durable command transport;
- filesystem / artifact access;
- CLI execution;
- DB / scheduler integration;
- checkpoints;
- runtime recovery;
- evidence persistence.

---

## 8. Technical invariants vs AI policy

Although research policy belongs to Scouter, Seed / Runtime still needs **technical invariants**.

Examples:

- unique command/action IDs;
- explicit timeout / abort behavior;
- deterministic result envelopes;
- crash/restart recovery;
- durable checkpoints where required;
- evidence correlation;
- idempotency where an action can be retried;
- target/frame/session identity tracking.

These are runtime correctness properties, not restrictions on Scouter's intelligence.

---

## 9. Evidence and regulation remain separate axes

Every capability should retain two independent assessments:

### Technical Reach

- PROVEN
- LIKELY
- NEEDS EXPERIMENT
- CONSTRAINED
- CLOSED

### Regulation / Boundary

- ALLOWED
- CONSTRAINED
- UNCERTAIN
- HIGH-RISK / PROHIBITED
- NEEDS STUDY

Technical ability must never be used as evidence that an action is allowed by a provider.

Regulation findings require external source evidence and timestamping. DOM/network observations can trigger research but must not themselves become the regulation verdict.

---

## 10. Current architectural agreement

The current workstream therefore adopts these working agreements:

1. **Scouter is the AI agent; Seed is its browser-side arm.**
2. **Seed should expose a broad, generic browser capability surface.**
3. **Discovery/research protocol belongs primarily to Scouter skills, not site-specific Seed logic.**
4. **Scouter may generate, debug, refresh, test, patch, and verify its own code/config through iterative evidence-backed loops.**
5. **Site-specific discoveries should become Site Adapter knowledge rather than contaminating Seed core.**
6. **Capability discovery should produce an auditable checklist with evidence-backed progress states.**
7. **Technical reach and regulation boundary remain independent.**
8. **Dedicated extensions are an escalation output, not the default outcome of discovery.**

---

## 11. Current open questions

Still intentionally unresolved:

- the exact Seed permission/API inventory;
- the canonical capability taxonomy and checklist size;
- the boundary between declarative adapters, `userScripts`, packaged modules, and dedicated extensions;
- evidence schema and storage format;
- adapter versioning and website-drift detection;
- continuous-learning / regression architecture;
- human-approval classes for high-impact actions;
- the first micro-proof sequence for a new website.

These should be reasoned before production implementation.
