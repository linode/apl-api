# REST API and GitOps

## Version one

**Sequence diagram for the accepted request**

The below diagram depicts what happens with each request that modifies the values repository.

The `Session Controller` is created on each HTTP POST/PUT/PATCH and DELETE requests that aims modifying gitops repo (i.e. values repo). The `Session Controller` is a local clone of the `Master session controller`. The `In-Memory DB` serves as cache made out of `Master session controller`. The `APL Core API` contains tools to perform SOPS encryption on files in both `Session Controller` and `Master session controller`.

There is a critical section that introduces locking mechanism. The locking mechanism ensures that single git operation (merge) happens on the `Master session controller` at the time.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Session Controller
    participant MC as Master Session Controller
    participant ACA as APL Core API
    participant RR as Remote Git
    participant IMDB as In-Memory DB
    activate MC
    activate IMDB
    Client->>API: HTTP POST/PUT/PATCH/DELETE
    activate API
    API->>SC: req
    activate SC
    SC->>SC: create unique session repo
    SC->>MC: git clone
    MC-->>SC: cloned
    SC->>SC: save file(s)
    alt optional
    SC->>ACA: encrypt (secrets.*.yaml.dec)
    activate ACA
    ACA-->>SC: encrypted (secrets.*.yaml)
    deactivate ACA
    end
    SC->>SC: git commit
    SC->>MC: git pull
    activate MC
    MC-->>SC: pulled
    deactivate MC
    SC->>MC: git push
    activate MC
    MC-->>SC: accepted
    deactivate MC
    SC->>SC: remove session repo
    SC->>MC: refresh
    activate MC
    critical: blocking operation
    MC->>RR: git pull (accept theirs)
    activate RR
    RR-->>MC: pulled
    deactivate RR
    activate RR
    deactivate RR
    MC->>ACA: decrypt (secrets.*.yaml)
    activate ACA
    ACA-->>MC: decrypted (secrets.*.yaml.dec)
    deactivate ACA
    MC->>IMDB: reload
    end
    MC-->>SC: accepted
    deactivate MC
    SC-->>API: res(resource ID)
    deactivate SC
    API-->>Client: resource ID
    deactivate API
    deactivate MC
    deactivate IMDB
```

**Sequence diagram for the rejected request**

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Session Controller
    participant MC as Master Session Controller
    participant RR as Remote Git
    participant ACA as APL Core API
    participant IMDB as In-Memory DB
    activate MC
    activate IMDB
    Client->>API: HTTP POST/PUT/PATCH/DELETE
    activate API
    API->>SC: req
    activate SC
    SC->>SC: create unique session repo
    SC->>MC: git clone
    MC-->>SC: cloned
    SC->>SC: save file(s)
    SC->>ACA: encrypt
    activate ACA
    ACA-->>SC: encrypted
    deactivate ACA
    SC->>SC: git commit
    SC->>MC: git pull
    activate MC
    MC-->>SC: pulled
    deactivate MC
    SC->>MC: git push
    activate MC
    MC-->>SC: rejected
    deactivate MC
    SC-->>API: res(HTTP 409)
    deactivate SC
    API-->>Client: HTTP 409
    deactivate API
    deactivate MC
    deactivate IMDB
```

## Version two

The locking mechanism is removed by removing the master session controller concept. The session repo controller pulls and pushes from/to Git instead of master repo. The Session Controller is also renamed to `Git handler` to not confuse it with user session.

**Sequence diagram for the accepted request**
The following diagram presents GitOps without locking mechanism. It is worth noting that is performs eight operations less comparing to its predecessor.
An important change is made to Session Controller, which is updating the In-memory DB. This operation is needed to ensure that GET requests can obtain the updated resources.

The loop form in the diagram indicates that some concurrent pushes can still occur,and that apl-api may need to retry the git operations. However it is not a blocking operation for any other HTTP request.
The encryption is an optional step, depending on secrets being modified or not.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Git Handler
    participant RR as Remote Git
    participant ACA as APL Core API
    participant IMDB as In-Memory DB
    activate IMDB
    Client->>API: HTTP POST/PUT/PATCH/DELETE
    activate API
    API->>SC: req
    activate SC
    SC->>SC: create session directory
    SC->>RR: git clone to session directory
    activate RR
    RR-->>SC: cloned
    deactivate RR
    SC->>SC: save file(req.body)
    alt optional
    SC->>ACA: encrypt (secrets.*.yaml.dec)
    activate ACA
    ACA-->>SC: encrypted (secrets.*.yaml)
    deactivate ACA
    end
    SC->>SC: git commit
    loop try three times
    SC->>RR: git pull
    activate RR
    RR-->>SC: pulled
    deactivate RR
    SC->>RR: git push
    activate RR
    RR-->>SC: accepted
    deactivate RR
    end
    SC->>SC: remove session repo
    SC->>IMDB: update_db(req.body)
    SC-->>API: res(resource ID)
    deactivate SC
    API-->>Client: resource ID
    deactivate API
    deactivate IMDB
```

**Sequence diagram for the rejected request**

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Git Handler
    participant RR as Remote Git
    participant ACA as APL Core API
    Client->>API: HTTP POST/PUT/PATCH/DELETE
    activate API
    API->>SC: req
    activate SC
    SC->>SC: create session directory
    SC->>RR: git clone to session directory
    activate RR
    RR-->>SC: cloned
    deactivate RR
    SC->>SC: save file(req.body)
    alt optional
    SC->>ACA: encrypt (secrets.*.yaml.dec)
    activate ACA
    ACA-->>SC: encrypted (secrets.*.yaml)
    deactivate ACA
    end
    SC->>SC: git commit
    SC->>RR: git pull
    activate RR
    RR-->>SC: pulled
    deactivate RR
    SC->>RR: git push
    activate RR
    RR-->>SC: rejected
    deactivate RR
    SC->>SC: remove session repo
    SC-->>API: res(HTTP 409)
    deactivate SC
    API-->>Client: HTTP 409
    deactivate API
```

## Version three - Git Worktrees

The git worktrees implementation eliminates the performance bottleneck of cloning from remote repository for each request. Instead, a main repository is maintained locally and git worktrees are created for each session. This provides instant session creation while maintaining complete isolation between concurrent operations.

**Key improvements:**
- Main repository cloned once at startup, eliminating remote clone overhead
- Git worktrees created instantly from local main repository
- Each session operates on an isolated branch with independent `.git/index.lock` files
- Direct push from session branch to main branch on remote
- Automatic cleanup of worktrees and branches after completion
- No blocking operations between concurrent sessions due to isolated git indexes

```mermaid
sequenceDiagram
     autonumber
     participant Client1 as Client 1
     participant Client2 as Client 2
     participant API as API Server
     participant MainRepo as Main Git Repo
     participant Worktree1 as Session Worktree 1
     participant Worktree2 as Session Worktree 2
     participant Remote as Remote Git Repository


     Note over API,MainRepo: Application Startup
     API->>MainRepo: Initialize main repo (clone/pull)
     activate MainRepo
     MainRepo-->>API: Ready


     Note over Client1,Remote: Concurrent API Requests
     Client1->>API: POST/PUT/DELETE Request
     activate API
     API->>API: Generate sessionId (UUID)
     API->>MainRepo: createWorktree(sessionId, main)
     MainRepo->>Worktree1: git worktree add -b sessionId path main
     activate Worktree1
     Worktree1-->>MainRepo: Session branch created
     MainRepo-->>API: Worktree repo instance
     API-->>Client1: Processing...


     Client2->>API: POST/PUT/DELETE Request (concurrent)
     API->>API: Generate sessionId (UUID)
     API->>MainRepo: createWorktree(sessionId2, main)
     MainRepo->>Worktree2: git worktree add -b sessionId2 path main
     activate Worktree2
     Worktree2-->>MainRepo: Session branch created
     MainRepo-->>API: Worktree repo instance
     API-->>Client2: Processing...


     Note over Worktree1,Remote: Session 1 Operations
     API->>Worktree1: writeFile(), modify configs
     API->>Worktree1: commit("otomi-api commit by user1")
     Worktree1->>Worktree1: git add . && git commit
     API->>Worktree1: save() - pull/push with retry
     loop Retry on conflicts
         Worktree1->>Remote: git pull origin main --rebase
         Remote-->>Worktree1: Latest changes
         Worktree1->>Remote: git push origin sessionId:main
         alt Push successful
             Remote-->>Worktree1: Success
         else Push failed (conflict)
             Remote-->>Worktree1: Conflict - retry
         end
     end


     Note over Worktree2,Remote: Session 2 Operations (parallel)
     API->>Worktree2: writeFile(), modify configs
     API->>Worktree2: commit("otomi-api commit by user2")
     Worktree2->>Worktree2: git add . && git commit
     API->>Worktree2: save() - pull/push with retry
     loop Retry on conflicts
         Worktree2->>Remote: git pull origin main --rebase
         Remote-->>Worktree2: Latest changes + Session1 commits
         Worktree2->>Remote: git push origin sessionId2:main
         alt Push successful
             Remote-->>Worktree2: Success
         else Push failed (conflict)
             Remote-->>Worktree2: Conflict - retry
         end
     end


     Note over API,Remote: Cleanup
     API->>MainRepo: removeWorktree(sessionId)
     MainRepo->>Worktree1: git worktree remove path
     deactivate Worktree1
     MainRepo-->>API: Worktree removed (branch auto-deleted)
     API-->>Client1: Response


     API->>MainRepo: removeWorktree(sessionId2)
     MainRepo->>Worktree2: git worktree remove path2
     deactivate Worktree2
     MainRepo-->>API: Worktree removed (branch auto-deleted)
     API-->>Client2: Response


     deactivate API
     deactivate MainRepo


     Note over Client1,Remote: Result: No slow remote cloning per request
     Note over Client1,Remote: Result: Instant worktree creation from local repo
     Note over Client1,Remote: Each session worked on isolated branch
     Note over Client1,Remote: Direct push to main: sessionBranch:main
     Note over Client1,Remote: No index.lock conflicts between sessions
```

**Git Index Isolation:**
Version two avoided `.git/index.lock` conflicts by cloning the entire repository from remote to separate directories for each session. While this provided isolation, it created a significant performance bottleneck due to repeated remote cloning.

Git worktrees provide the same isolation benefits but with instant creation from a local repository:
- Main repo: `.git/index` and `.git/index.lock`  
- Worktree 1: `.git/worktrees/sessionId1/index` and `.git/worktrees/sessionId1/index.lock`
- Worktree 2: `.git/worktrees/sessionId2/index` and `.git/worktrees/sessionId2/index.lock`

This maintains the concurrency benefits of version two while eliminating the remote cloning performance penalty.
