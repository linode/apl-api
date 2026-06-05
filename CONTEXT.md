# APL API

The APL API manages platform configuration through a GitOps workflow. It is the authoritative writer of the values repository and serves as the backend for the APL console.

## Language

### GitOps

**Values Repository**: The remote Git repository that stores all platform configuration (Otomi values). The API clones it at startup, reads from it to serve GET requests, and writes to it on every mutation. Pointed to by `GIT_REPO_URL`.
_Avoid_: config repo, git repo, remote repo

**Git Handler**: A per-request isolated copy of the values repository used to stage and commit a single mutation before pushing. Implemented as a git worktree off the Main Repository.
_Avoid_: session repo, session controller, session worktree

**Main Repository**: The long-lived local clone of the Values Repository maintained by the API process. Git Handlers are created as worktrees from it. Backed by `GIT_LOCAL_PATH`.
_Avoid_: master session controller, root clone, root repo

**GitOps Workflow**: The full lifecycle of a mutation request — create Git Handler, write files, commit, pull/push with retry, remove Git Handler, update in-memory store.
_Avoid_: git flow, git save flow

### Authentication

**HTTPS Authentication**: Values Repository access using a username and personal access token embedded in the clone URL. Configured via `GIT_USER` and `GIT_PASSWORD`.
_Avoid_: token auth, password auth

**SSH Authentication**: Values Repository access using an SSH private key mounted into the pod as a file. Configured via `GIT_REPO_URL` (a `git@` URL) and `GIT_SSH_KEY_PATH` (path to the mounted key file).
_Avoid_: key auth, pubkey auth

### Resources

**Code Repository** (`AplTeamCodeRepo`): An external Git repository registered by a team for use as a build source (ArgoCD, Gitea). Distinct from the Values Repository — it is team-scoped and does not participate in the GitOps Workflow.
_Avoid_: code repo, git repo (ambiguous)

**Session**: A user editing context that owns a Git Handler for the duration of a single API request or interactive editing session.
