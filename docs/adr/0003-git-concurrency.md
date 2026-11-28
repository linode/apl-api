# ADR: Git Writes Without Shared State Between Sessions

- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision owners:** APL engineering
- **Scope:** `src/git.ts`, `OtomiStack.requestSync()`, the publish flow in `src/otomi-stack.ts`, `checkAgainstGit` in `src/app.ts`

## Context

Under many concurrent API writes, customers saw two errors:

- `Cannot fast-forward your working tree.`
- `Failed to remove upstream commits!`

Every write request gets a **session**: a git worktree at `/tmp/otomi/values/{sessionId}`, created from **Root** (the clone at `GIT_LOCAL_PATH`). All worktrees share Root's `.git` directory. That means one object database, one `.git/config`, one `.git/shallow`, and one set of refs, including `refs/remotes/origin/main`.

The old flow ran git commands on Root and on the shared `.git` files from many requests at the same time:

| Step            | Old behaviour                                     | What went wrong                                                                               |
| --------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Session open    | `pull --rebase --depth 5` on Root                 | Concurrent pulls on one checkout: `index.lock`, `shallow.lock`, "Cannot fast-forward"         |
| Worktree setup  | `addConfig()` per worktree                        | Concurrent writes to the shared `.git/config`: `could not lock config file`                   |
| Session save    | `pull --rebase --depth 5` + `push origin`         | Both write `refs/remotes/origin/main`: `cannot lock ref`; `--depth` rewrites `.git/shallow`   |
| Every 3rd retry | Root recovery: `merge -X theirs` + `push --force` | Merge commits on Root (divergence). The force push **deleted other sessions' pushed commits** |
| After publish   | `rootStack.git.git.pull()`                        | Yet another concurrent pull on Root                                                           |

A stress test against a real git remote (`npm run test:git-stress`) reproduced all of it. In 60 requests: 13× "Cannot fast-forward", 14× "divergent branches", 27× "Failed to remove upstream commits!", and **10 lost commits**. With the force push disabled there were 0 lost commits, so the force push caused the data loss. On a cluster running `main`, 10 concurrent team creations returned 200 for all 10, but team `bl07` was never in the remote. The force push overwrote it.

## Decision

Sessions share nothing that git writes concurrently, and Root has exactly one writer. No lock around git commands.

### TL;DR

We use the local git storage that all worktrees already share, instead of the network and shared refs:

1. **Worktrees start from `Git.latestSha`.** That's the newest commit pushed from this pod, and it's already in the shared object database. A new session starts up to date without a Root pull or a fetch. When a push loses to another session in this pod, the session rebases onto that session's commit locally. It only fetches when someone outside the pod pushed. On a cluster with 45 concurrent writes, this cut ~45 parallel fetches down to 1.
2. **Root never pushes and never merges.** Root only follows the remote with `fetch` + `reset --hard`. The force push that deleted other sessions' commits is gone. After a publish, Root's FileStore is updated in memory and its checkout isn't touched.
3. **`requestSync()` runs one sync at a time.** The periodic check is Root's only git writer. Callers during a running sync share it, so Root's checkout never sees two git commands at once.
4. **Sessions don't write shared git state.** They fetch into their own `FETCH_HEAD`, push by URL, and don't write `.git/config`. That removed the `cannot lock ref` and `could not lock config file` errors.

The table lists every change.

| Area               | Now                                                                                                                                                    | Replaces                                                             | Why                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Root sync          | `fetch` + `checkout` + `reset --hard origin/<branch>` + `clean`                                                                                        | `pull --rebase` with merge/force-push recovery                       | Root never commits, so a reset loses nothing and always succeeds. No merge commits, no force push.                                           |
| Root sync runs     | `OtomiStack.requestSync()`: one sync at a time; callers during a sync share it and schedule one more run                                               | Uncoordinated pulls from session open, publish and `checkAgainstGit` | One writer for Root's checkout                                                                                                               |
| Root fetch         | No `--depth`                                                                                                                                           | `--depth 5`                                                          | `--depth` rewrites `.git/shallow` while session git commands read it: `fatal: shallow file has changed since we read it` (seen on a cluster) |
| Session open       | No Root pull. Worktree starts from `Git.latestSha`, or Root's branch when there is none yet                                                            | `pull` on Root before `worktree add`                                 | `latestSha` is the newest commit pushed from this process. It is already local (shared objects), so no network and no Root writes            |
| Session fetch      | `fetch --refmap= <url> refs/heads/<branch>` into the worktree's own `FETCH_HEAD`                                                                       | `pull origin`                                                        | An empty refmap writes no shared remote-tracking ref                                                                                         |
| Session push       | `push <url> HEAD:refs/heads/<branch>`                                                                                                                  | `push origin`                                                        | Pushing by URL does not update the shared remote-tracking ref                                                                                |
| Session retry      | Rebase onto `Git.latestSha` locally when another session here pushed since the last try; fetch otherwise. Only fetches count toward `GIT_PUSH_RETRIES` | Fetch on every attempt; every 3rd attempt the Root recovery          | See "Push contention" below                                                                                                                  |
| Worktree config    | No `addConfig()` per worktree                                                                                                                          | `addConfig()` per worktree                                           | Worktrees already share Root's `.git/config`                                                                                                 |
| After publish      | No Root git operation. Root's FileStore is updated in memory as before                                                                                 | `rootStack.git.git.pull()`                                           | Root lagging behind is fine: new worktrees start from `latestSha`                                                                            |
| `checkAgainstGit`  | Catches a failed sync and logs it                                                                                                                      | Threw after retries                                                  | It runs from `setInterval`; an unhandled rejection stopped the process (seen on a cluster)                                                   |
| `GIT_PUSH_RETRIES` | Default 20                                                                                                                                             | Default 12                                                           | At 12, 5–7 of 60 stress requests still failed                                                                                                |
| Guards             | `pull()` throws on a session; `pushWithRetry()` and `requestSync()` throw on the wrong clone                                                           | "Root only" comments                                                 | The rule is enforced instead of documented                                                                                                   |

### Push contention

Git accepts only one push per branch at a time. When several sessions push from the same commit, one wins and the rest are rejected. They then have to rebase onto the new commit and try again.

We used to fetch from the remote before every retry. With N sessions that adds up to roughly N² fetches. On a cluster with 45 concurrent writes, git-server was stuck at its CPU limit, and requests finished at about one every 35 s.

Usually the winning push comes from another session in the same pod, so its commit is already on disk. We now remember it in `Git.latestSha`, and a losing session rebases onto it locally. It only fetches when someone outside the pod pushed. Under the same load we saw 1 fetch at a time instead of 45.

A local retry only happens after another session's push succeeded, so local retries always end. That's why only fetches count toward `GIT_PUSH_RETRIES`.

## Considered Options

- **A lock around all git commands.** The values layout keeps concurrent writes on separate files, so a lock would slow down the whole API for no gain.
- **A push queue per pod.** Running only the rebase and push one at a time would also remove the rejected pushes. We left it out because `latestSha` already removes the expensive fetches without a lock. It's the next step if rejected pushes turn out to load git-server.
- **Group commit.** Sending all waiting commits in one push gives the most throughput, but requests would then depend on each other's results. Worth considering after a push queue.
- **A custom git backend**, like OpenAI's Pando. That's a server-side change and out of scope for apl-api.

## Consequences

- Two writes to the same lines of a file now fail with an error. The old code silently kept one side.
- There are more push attempts than before. A rejected push is cheap for git-server, though not free.
- `latestSha` is kept in memory. After a restart the first session starts from Root's branch and fetches before pushing.
- Root's checkout can run behind the remote until the next periodic sync. Reads are not affected, because they come from the FileStore.
- Fetch and push now pass the authenticated URL as an argument, which makes the git password visible in `ps` inside the pod. A credential helper would fix this.
- Session branches are never deleted, as before. This needs a separate fix.
- Multiple API replicas still work correctly, but the `latestSha` speedup only helps within one pod. Each pod's FileStore still only sees other pods' writes after its periodic sync.
