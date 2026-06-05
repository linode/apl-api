# SSH authentication for the values repository uses a mounted key file, not inline key content

To support SSH access to the values repository, the SSH private key is delivered as a Kubernetes Secret volume mount. `GIT_SSH_KEY_PATH` points to that file. The API never writes or copies the key — it passes the path directly to `GIT_SSH_COMMAND`.

This contrasts with the existing `codeRepoUtils.ts` pattern for team code repositories, which receives key content from a Kubernetes secret and writes it to a temp file under `/tmp/otomi/`. That pattern is acceptable for short-lived test connections, but the values repository connection is long-lived (held for the process lifetime) and the temp-file lifecycle is harder to reason about. A mounted file is owned by Kubernetes, requires no cleanup logic, and keeps secret material out of env vars entirely.

## Considered Options

- **Inline key content via env var** — consistent with `codeRepoUtils.ts`, but puts PEM material in an env var, which is visible in pod specs and process listings.
- **Mounted key file (chosen)** — secret material managed by Kubernetes, zero temp-file lifecycle code, standard practice for long-lived SSH clients in pods.

## Consequences

Pod specs for SSH-mode deployments must mount the SSH key Secret as a volume and set `GIT_SSH_KEY_PATH` to the mount path. `GIT_USER` and `GIT_PASSWORD` are not required when `GIT_REPO_URL` is a `git@` URL.
