# REST API and GitOps

The below diagram depicts what happens with each request that modifies the values repository.

The `Session Repo` and Session Controller are created on each HTTP POST/PUT/PATCH requests that aims modifying gitops repo (i.e. values repo). The `Session Repo` is a local clone of the `Master repo`. The `Master repo` and `Master controller` are used to merge changes from the `Session Repo(s)`. The `In-Memory DB` serves as cache made out of `Master repo`. The `APL Core API` containes tools to perform SOPS encryption on files both `Session repos` and `Master repo`.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant API as Express API
    participant SC as Session Controller
    participant MC as Master Controller
    participant IMDB as In-Memory DB
    participant SR as Session Repo
    participant MR as Master Repo
    participant RR as Remote Repo
    participant ACA as APL Core API

alt Modify resource
    activate MR
    activate MC
    Client->>API: HTTP POST/PUT/PATCH
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
    SC->>MR: git pull
    MR->>SR: pulling
    MR-->>SC: pulled
    SC->>MR: git push
    MR-->>SC: accepted
    SC->>MC: trigger push
    critical: blocking operation
    activate MC
    MC->>RR: git push
    RR-->>MC: accepted
    SC->>SR: remove session repo
    deactivate SR
    MC->>RR: git pull
    RR->>MR: pulling
    RR-->>MC: pulled
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
end

alt Read resource
    Client->>API: HTTP GET
    API->>+SC: req
    SC->>+IMDB: get()
end
```
