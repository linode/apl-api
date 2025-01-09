# REST API and GitOps

## Modifying data

The below diagram depicts what happens with each request that modifies the values repository.

The `Session Repo` and Session Controller are created on each HTTP POST/PUT/PATCH and DELETE requests that aims modifying gitops repo (i.e. values repo). The `Session Repo` is a local clone of the `Master repo`. The `Master repo` and `Master controller` are used to merge changes from the `Session Repo(s)`. The `In-Memory DB` serves as cache made out of `Master repo`. The `APL Core API` contains tools to perform SOPS encryption on files in both `Session repos` and `Master repo`.

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
    SC->>MR: git pull
    MR->>SR: pulling
    MR-->>SC: pulled
    SC->>MR: git push
    MR-->>SC: accepted
    SC->>SR: remove session repo
    deactivate SR
    SC->>MC: trigger push
    activate MC
    critical: blocking operation
    MC->>RR: git pull
    activate RR
    RR->>MR: pulling
    RR-->>MC: pulled
    deactivate RR
    MC->>RR: git push
    activate RR
    RR-->>MC: accepted
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
