# ADR: Serialize Dex Group Updates With an In-Process Lock

- **Status:** Accepted
- **Date:** 2026-11-10
- **Decision owners:** APL engineering
- **Scope:** Dex `Password` group changes in apl-api (`AUTH_PROVIDER=dex`)

## Context

Dex's `UpdatePassword` call has no way to add or remove a single group. It replaces the whole group list. So every group change is read the groups, change them, then write the full list back.

When two changes overlap, the second write uses an old list and undoes the first. For example, a user is in `team-blue` and `team-red`, and both teams are deleted at the same time:

| Time | Request A, delete `blue`      | Request B, delete `red`                      |
| ---- | ----------------------------- | -------------------------------------------- |
| t0   | reads `[team-blue, team-red]` | reads `[team-blue, team-red]`                |
| t1   | writes `[team-red]`           |                                              |
| t2   |                               | writes `[team-blue]`, so `blue` comes back ✘ |

The same happens when an `editUser` role change overlaps a team delete: one change is lost.

## Decision

Run every Dex group read-modify-write inside `withDexGroupLock` (`src/clients/dexClient.ts`). This is a promise queue: each call waits until the previous one has finished, then reads fresh data.

```ts
let dexGroupQueue: Promise<unknown> = Promise.resolve()
export function withDexGroupLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = dexGroupQueue.then(() => fn()) // start after the previous call finishes
  dexGroupQueue = run.catch(() => undefined) // a failed call doesn't block later ones
  return run // the caller still gets fn's result or error
}
```

The same example with the lock:

| Time | Request A, delete `blue`      | Request B, delete `red` |
| ---- | ----------------------------- | ----------------------- |
| t0   | reads `[team-blue, team-red]` | waits                   |
| t1   | writes `[team-red]`           |                         |
| t2   |                               | reads `[team-red]`      |
| t3   |                               | writes `[]` ✔           |

The read and the write must both happen inside `fn`. These paths use the lock: `deleteAplTeam` (removing the team group), `editUser` and `editTeamUsers`.

## Consequences

- Group changes in apl-api can no longer overwrite each other.
- Group changes run one at a time. They are rare and fast, so this costs nothing in practice.
- A hanging Dex call holds up the queue until the gRPC deadline (`DEX_RPC_DEADLINE_MS`) ends it.
- The lock only works inside one process. This is fine because apl-api runs with `replicaCount: 1`.
- The lock doesn't protect changes based on data the browser read earlier. The console's team-users screen sends full `teams` lists, so it can still overwrite another admin's change.

## Alternatives considered

- **Add or remove a single group in Dex:** not possible, the Dex API has no such call.
- **Check for conflicts with a version number:** the `Password` record has no version or `resourceVersion` to check against.
- **A lock shared across pods (for example a Kubernetes Lease):** more work and more moving parts than one replica needs. Revisit this if apl-api scales out.
