# REST API and GitOps

## Modifying data

The below diagram depicts what happens with each request that modifies the values repository.

The `Session Repo` and Session Controller are created on each HTTP POST/PUT/PATCH and DELETE requests that aims modifying gitops repo (i.e. values repo). The `Session Repo` is a local clone of the `Master repo`. The `Master repo` and `Master controller` are used to merge changes from the `Session Repo(s)`. The `In-Memory DB` serves as cache made out of `Master repo`. The `APL Core API` contains tools to perform SOPS encryption on files in both `Session repos` and `Master repo`.

There is a critical section that introduces locking mechanism. The locking mechanism ensures that single git operation (merge) happens on the master repo at the time.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Session Controller
    participant MC as Master Session Controller
    participant IMDB as In-Memory DB
    participant SR as Session Repo 1
    participant MR as Master Repo
    participant RR as Remote Repo
    participant ACA as APL Core API

    activate MR
    activate MC
    activate IMDB
    Client->>API: HTTP POST/PUT/PATCH/DELETE
    activate API
    API->>SC: req
    activate SC
    SC->>SR: create unique session repo
    activate SR
    SC->>MR: git clone
    MR->>SR: cloning
    MR-->>SC: cloned
    SC->>SR: save file(s)
    SC->>ACA: encrypt
    activate ACA
    ACA->>SR: encrypting
    ACA-->>SC: encrypted
    deactivate ACA
    SC->>SR: git commit
    SC->>RR: git pull
    RR->>SR: pulling
    SR-->>SC: pulled
    SC->>RR: git push
    RR-->>SC: accepted
    SC->>SR: remove session repo
    deactivate SR
    SC->>MC: refresh
    activate MC
    critical: blocking operation
    MC->>RR: git pull (accept theirs)
    activate RR
    RR->>MR: pulling
    RR-->>MC: pulled
    deactivate RR
    activate RR
    deactivate RR
    MC->>ACA: decrypt
    activate ACA
    ACA->>MR: decrypting
    ACA-->>MC: decrypted
    deactivate ACA
    MC->>IMDB: reload
    end
    MC-->>SC: accepted
    deactivate MC
    SC-->>API: res(resource ID)
    deactivate SC
    API-->>Client: resource ID
    deactivate API
    deactivate MR
    deactivate MC
    deactivate IMDB
```

Rejected request

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Session Controller
    participant MC as Master Session Controller
    participant IMDB as In-Memory DB
    participant SR as Session Repo 1
    participant MR as Master Repo
    participant RR as Remote Repo
    participant ACA as APL Core API
    activate MR
    activate MC
    activate IMDB
    Client->>API: HTTP POST/PUT/PATCH/DELETE
    activate API
    API->>SC: req
    activate SC
    SC->>SR: create unique session repo
    activate SR
    SC->>MR: git clone
    MR->>SR: cloning
    MR-->>SC: cloned
    SC->>SR: save file(s)
    SC->>ACA: encrypt
    activate ACA
    ACA->>SR: encrypting
    ACA-->>SC: encrypted
    deactivate ACA
    SC->>SR: git commit
    SC->>RR: git pull
    RR->>SR: pulling
    SR-->>SC: rejected
    SC->>SR: remove session repo
    deactivate SR
    deactivate MC
    SC-->>API: rejected
    deactivate SC
    API-->>Client: HTTP 409
    deactivate API
    deactivate MR
    deactivate IMDB
```

## Getting data

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant MC as Master Session Controller
    participant IMDB as In-Memory DB

    Client->>API: HTTP GET
    activate API
    API->>MC: req
    activate MC
    MC->>IMDB: get
    MC-->>API: res
    deactivate MC
    API-->>Client: res
    deactivate API
```

## Removing the locking mechanism

The locking mechanism is removed by abandoning the master repo and master repo controller concepts. The session repo controller pulls and pushes from/to Gitea instead of master repo.
The following diagram presents GitOps without locking mechanism. It is worth noting that is performs eight operations less comparing to its predecessor.
An important change is made to Session Controller, which is updating the In-memory DB. This operation is needed to ensure that GET requests can obtain the updated resources.

The loop form the diagram indicates that there some concurrent pushes can still occur,and that apl-api may need to retry the git operations. However it is not a blocking operation for any other HTTP request.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Session Controller
    participant IMDB as In-Memory DB
    participant SR as Session Repo 1
    participant RR as Remote Repo
    participant ACA as APL Core API

    activate IMDB
    Client->>API: HTTP POST/PUT/PATCH/DELETE
    activate API
    API->>SC: req
    activate SC
    SC->>SR: create unique session repo
    activate SR
    SC->>RR: git clone
    activate RR
    RR->>SR: cloning
    RR-->>SC: cloned
    deactivate RR
    SC->>SR: save file(req.body)
    SC->>ACA: encrypt
    activate ACA
    ACA->>SR: encrypting
    ACA-->>SC: encrypted
    deactivate ACA
    SC->>SR: git commit
    loop try three times
    SC->>RR: git pull
    activate RR
    RR->>SR: pulling
    RR-->>SC: pulled
    deactivate RR
    SC->>RR: git push
    activate RR
    RR-->>SC: accepted
    deactivate RR
    end
    SC->>SR: remove session repo
    deactivate SR
    SC->>IMDB: update_db(req.body)

    SC-->>API: res(resource ID)
    deactivate SC
    API-->>Client: resource ID
    deactivate API
    deactivate IMDB
```
