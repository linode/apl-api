# REST API and GitOps

## Version one

**Sequence diagram for the accepted request**
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
    participant RR as Remote Repo
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
    MC->>ACA: decrypt
    activate ACA
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
    participant RR as Remote Repo
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

## Version one

The locking mechanism is removed by removing the master session controller concept. The session repo controller pulls and pushes from/to Gitea instead of master repo.
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
    participant RR as Remote Repo
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
    participant RR as Remote Repo
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
