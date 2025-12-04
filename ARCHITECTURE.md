# FileStore Architecture Documentation

This document provides visual representations of the FileStore architecture and data flow patterns in the Otomi API.

## Table of Contents
1. [High-Level Architecture](#1-high-level-architecture)
2. [Object Transformation Flow](#2-object-transformation-flow)
3. [CRUD Operation Flows](#3-crud-operation-flows)
4. [Secret File Handling](#4-secret-file-handling)
5. [FileStore Load Process](#5-filestore-load-process)
6. [File Path Generation](#6-file-path-generation)

---

## 1. High-Level Architecture

This diagram shows the relationship between key components and data types.

```mermaid
classDiagram
    class OtomiStack {
        +FileStore fileStore
        +Git git
        +createCodeRepo(teamId, data)
        +getCodeRepo(teamId, name)
        +editCodeRepo(teamId, name, data)
        +deleteCodeRepo(teamId, name)
    }

    class FileStore {
        -Map~string, AplObject~ store
        +load(envDir) FileStore
        +get(filePath) AplObject
        +set(filePath, content) AplRecord
        +delete(filePath) string
        +getTeamResource(kind, teamId, name) AplObject
        +setTeamResource(aplTeamObject) string
        +deleteTeamResource(kind, teamId, name) string
        +getByKind(kind, teamId) Map
    }

    class Git {
        +writeFile(path, content)
        +removeFile(path)
        +save(editor, encryptSecrets, files)
        +fileExists(path) boolean
    }

    class AplObject {
        <<interface>>
        +AplKind kind
        +metadata
        +spec Record
        +status? Record
    }

    class AplTeamObject {
        <<interface>>
        +AplKind kind
        +metadata with teamId label
        +spec Record
    }

    class AplPlatformObject {
        <<interface>>
        +AplKind kind
        +metadata
        +spec Record
    }

    class AplRequestObject {
        <<union>>
        AplServiceRequest | AplCodeRepoRequest | ...
    }

    class AplResponseObject {
        <<union>>
        AplServiceResponse | AplCodeRepoResponse | ...
    }

    OtomiStack --> FileStore : uses
    OtomiStack --> Git : uses
    FileStore --> AplObject : stores
    AplTeamObject --|> AplObject : extends
    AplPlatformObject --|> AplObject : extends
    AplRequestObject ..> AplTeamObject : transforms to
    AplResponseObject ..> AplObject : based on

    note for FileStore "In-Memory Cache\nMerged secrets\nFast access"
    note for Git "On-Disk Storage\nSecrets split\nVersion controlled"
```

---

## 2. Object Transformation Flow

This diagram shows how objects transform as they move through the system.

```mermaid
flowchart TB
    subgraph "V2 API Layer"
        V2Request[AplRequestObject<br/>AplCodeRepoRequest, etc.<br/>kind + metadata + spec]
    end

    subgraph "Request Transformation"
        toTeam["toTeamObject()"]
    end

    subgraph "Storage Layer"
        AplTeam[AplTeamObject<br/>+ teamId label]
        FileStore[(FileStore<br/>In-Memory)]
        Git[(Git Repository<br/>On-Disk)]
    end

    subgraph "V2 API Response"
        AplResp[AplResponseObject<br/>AplCodeRepoResponse, etc.<br/>kind + metadata + spec + status]
    end

    %% CREATE/UPDATE Flow
    V2Request -->|"1. Add teamId label"| toTeam
    toTeam --> AplTeam
    AplTeam -->|"2. Store (with secrets)"| FileStore
    AplTeam -->|"3. Write (secrets split)"| Git

    %% READ Flow
    FileStore -->|"4. Retrieve directly"| AplResp
```

---

## 3. CRUD Operation Flows

### 3.1 CREATE Flow

```mermaid
sequenceDiagram
    participant API as API Endpoint
    participant Stack as OtomiStack
    participant FS as FileStore
    participant Git as Git
    participant Root as RootStack

    API->>Stack: createAplCodeRepo(teamId, aplRequest)

    Note over Stack: Add teamId label
    Stack->>Stack: toTeamObject(teamId, aplRequest)

    Note over Stack: Save to storage
    Stack->>FS: setTeamResource(aplTeamObject)
    FS-->>Stack: filePath

    Stack->>Git: writeFile(filePath, aplTeamObject)
    Git-->>Stack: success

    Note over Stack: Deploy changes
    Stack->>Stack: doDeployment(aplRecord)
    Stack->>Git: save(editor, encryptSecrets, files)
    Stack->>Git: pull()

    Note over Stack: Update root FileStore
    Stack->>Root: fileStore.set(filePath, content)

    Stack-->>API: AplCodeRepoResponse
```

### 3.2 READ Flow

```mermaid
sequenceDiagram
    participant API as API Endpoint
    participant Stack as OtomiStack
    participant FS as FileStore

    API->>Stack: getAplCodeRepo(teamId, name)

    Note over Stack: Generate file path
    Stack->>Stack: getResourceFilePath(kind, name, teamId)

    Stack->>FS: getTeamResource(kind, teamId, name)

    Note over FS: Lookup in in-memory Map
    FS->>FS: store.get(filePath)
    FS-->>Stack: AplObject (with merged secrets)

    Stack-->>API: AplCodeRepoResponse
```

### 3.3 UPDATE Flow

```mermaid
sequenceDiagram
    participant API as API Endpoint
    participant Stack as OtomiStack
    participant FS as FileStore
    participant Git as Git
    participant Root as RootStack

    API->>Stack: editAplCodeRepo(teamId, name, aplRequest)

    Note over Stack: Get existing resource
    Stack->>FS: getTeamResource(kind, teamId, name)
    FS-->>Stack: existing AplObject

    Note over Stack: Merge specs
    Stack->>Stack: merge(existing.spec, aplRequest.spec)

    Note over Stack: Build updated object
    Stack->>Stack: buildTeamObject(existing, updatedSpec)

    Stack->>FS: setTeamResource(updatedObject)
    FS-->>Stack: filePath

    Stack->>Git: writeFile(filePath, updatedObject)

    Note over Stack: Deploy
    Stack->>Stack: doDeployment(aplRecord)
    Stack->>Root: fileStore.set(filePath, content)

    Stack-->>API: AplCodeRepoResponse
```

### 3.4 DELETE Flow

```mermaid
sequenceDiagram
    participant API as API Endpoint
    participant Stack as OtomiStack
    participant FS as FileStore
    participant Git as Git
    participant Root as RootStack

    API->>Stack: deleteCodeRepo(teamId, name)

    Note over Stack: Delete from FileStore
    Stack->>FS: deleteTeamResource(kind, teamId, name)
    FS->>FS: store.delete(filePath)
    FS-->>Stack: filePath

    Note over Stack: Delete from Git
    Stack->>Git: removeFile(filePath)
    Git-->>Stack: success

    Note over Stack: Check for secret file
    Stack->>Stack: getSecretFilePath(filePath)
    Stack->>Git: fileExists(secretFilePath)

    alt Secret file exists
        Stack->>Git: removeFile(secretFilePath)
    end

    Note over Stack: Deploy deletion
    Stack->>Stack: doDeleteDeployment([filePath])
    Stack->>Git: save(editor, encryptSecrets)
    Stack->>Root: fileStore.delete(filePath)

    Stack-->>API: void
```

---

## 4. Secret File Handling

### 4.1 Secret Extraction and Storage

```mermaid
flowchart TB
    subgraph "Input"
        AplObj[AplObject with secrets<br/>spec: name, password, apiKey]
        SecretPaths[Secret Paths<br/>password, apiKey]
    end

    subgraph "saveWithSecrets Process"
        Extract[Extract secrets<br/>from spec using paths]
        Split{Split data}
        MainSpec[Main Spec<br/>name only]
        SecretSpec[Secret Spec<br/>password, apiKey]
    end

    subgraph "FileStore Storage"
        FSFull[Store FULL object<br/>with secrets merged]
    end

    subgraph "Git Storage"
        GitMain[Write main file<br/>env/teams/demo/services/api.yaml<br/>spec: name]
        GitSecret[Write secret file<br/>env/teams/demo/secrets.services/api.yaml<br/>spec: password, apiKey]
    end

    AplObj --> Extract
    SecretPaths --> Extract
    Extract --> Split

    Split --> MainSpec
    Split --> SecretSpec

    AplObj --> FSFull

    MainSpec --> GitMain
    SecretSpec --> GitSecret
```

### 4.2 Secret Path Extraction Functions

```mermaid
flowchart LR
    subgraph "Global Secret Paths"
        Global["apps.harbor.adminPassword<br/>dns.provider<br/>kms.accessKey<br/>teamConfig...settings.apiToken"]
    end

    subgraph "Extraction Functions"
        ExtractApp["extractAppSecretPaths(appName)<br/>Filter: apps.{appName}.*<br/>Strip prefix"]
        ExtractSettings["extractSettingsSecretPaths(kind)<br/>Filter by prefix map<br/>AplDns → dns.*<br/>AplKms → kms.*"]
        ExtractTeam["extractTeamSecretPaths()<br/>Filter: teamConfig.pattern...*<br/>Strip prefix"]
    end

    subgraph "Resource-Specific Paths"
        AppPaths["adminPassword"]
        SettingsPaths["provider<br/>accessKey"]
        TeamPaths["apiToken"]
    end

    Global --> ExtractApp
    Global --> ExtractSettings
    Global --> ExtractTeam

    ExtractApp --> AppPaths
    ExtractSettings --> SettingsPaths
    ExtractTeam --> TeamPaths
```

### 4.3 Secret Merge During Load

```mermaid
flowchart TB
    subgraph "On Disk - Git Repository"
        MainFile["env/teams/demo/settings.yaml<br/>kind: AplTeamSettingSet<br/>spec: name='demo'"]
        SecretFile["env/teams/demo/secrets.settings.yaml<br/>kind: AplTeamSettingSet<br/>spec: apiToken='ENC...'"]
    end

    subgraph "FileStore.load() - PASS 1"
        Load1[Load all YAML files<br/>Validate with Zod]
        TempMap["Temporary Map<br/>settings.yaml → spec with name<br/>secrets.settings.yaml → spec with apiToken"]
    end

    subgraph "FileStore.load() - PASS 2"
        Detect{Detect secret file<br/>path includes '/secrets.'}
        GetMain[Get main file<br/>mainPath = path replace '/secrets.' with '/']
        Merge[Deep merge specs<br/>lodash merge main and secret]
        Delete[Delete secret entry<br/>from temp map]
    end

    subgraph "In-Memory - FileStore"
        Final["settings.yaml<br/>kind: AplTeamSettingSet<br/>spec: name='demo', apiToken='ENC...'"]
    end

    MainFile --> Load1
    SecretFile --> Load1
    Load1 --> TempMap

    TempMap --> Detect
    Detect -->|"Yes"| GetMain
    GetMain --> Merge
    Merge --> Delete
    Delete --> Final
```

---

## 5. FileStore Load Process

Complete two-pass loading and merging process.

```mermaid
flowchart TB
    Start([Start: FileStore.load])

    subgraph "PASS 1: Load All Files"
        GetMaps[Get FileMaps for all AplKinds]
        Glob[Glob for files matching patterns<br/>.yaml and .yaml.dec]
        LoadYAML[Load YAML content]
        LogWarning[Warning logged failed validation]

        CheckSkip{Skip validation?<br/>sealedsecrets/<br/>workloadValues/}
        Validate[Validate with Zod<br/>AplObjectSchema]
        ValidFail{Valid?}

        StoreTemp[Store in temporary Map<br/>relativePath -> AplObject]
    end

    subgraph "PASS 2: Merge Secrets"
        Iterate[Iterate all temp files]
        IsSecret{Path contains<br/>'/secrets.'?}

        GetMainPath[mainPath = path<br/>.replace '/secrets.', '/']
        MainExists{Main file<br/>exists?}

        DeepMerge[Deep merge secret.spec<br/>into main.spec<br/>merge, main.spec, secret.spec]

        UseAsMain[Store secret as main<br/>Special case: users]

        RemoveSecret[Remove secret file<br/>from temp map]
    end

    subgraph "Final Storage"
        StoreAll[Store all merged files<br/>in FileStore.store Map<br/> 'env/teams/builds/build-1.yaml' -> AplObject]
        ReturnFS[Return FileStore instance]
    end

    Start --> GetMaps
    GetMaps --> Glob
    Glob --> LoadYAML

    LoadYAML --> CheckSkip
    CheckSkip -->|No| Validate
    CheckSkip -->|Yes| StoreTemp

    Validate --> ValidFail
    ValidFail -->|Yes| StoreTemp
    ValidFail -->|No| LogWarning

    StoreTemp --> Iterate

    Iterate --> IsSecret
    IsSecret -->|No| Iterate
    IsSecret -->|Yes| GetMainPath

    GetMainPath --> MainExists
    MainExists -->|Yes| DeepMerge
    MainExists -->|No| UseAsMain

    DeepMerge --> RemoveSecret
    UseAsMain --> RemoveSecret

    RemoveSecret --> Iterate

    Iterate --> StoreAll
    StoreAll --> ReturnFS
    ReturnFS --> End([End])
```

---

## 6. File Path Generation

### 6.1 Path Generation Process

```mermaid
flowchart LR
    subgraph "Input"
        Int["kind: AplTeamService<br/>name: 'api'<br/>teamId: 'demo'"]
    end

    subgraph "getResourceFilePath()"
        GetMap["Get FileMap for kind<br/>getFileMapForKind(kind)"]
        Template["pathTemplate:<br/>'env/teams/{teamId}/services/{name}.yaml'"]
        Replace1["Replace {teamId}<br/>→ 'demo'"]
        Replace2["Replace {name}<br/>→ 'api'"]
    end

    subgraph "Output"
        Out["'env/teams/demo/services/api.yaml'"]
    end

    Input --> GetMap
    GetMap --> Template
    Template --> Replace1
    Replace1 --> Replace2
    Replace2 --> Output

```

### 6.2 Secret File Path Derivation

```mermaid
flowchart LR
    subgraph "Main File Path"
        Main["'env/teams/demo/settings.yaml'"]
    end

    subgraph "getSecretFilePath()"
        Split["Split by '/'<br/>['env', 'teams', 'demo', 'settings.yaml']"]
        ExtractDir["dir = parts.slice(0, -1)<br/>['env', 'teams', 'demo']"]
        ExtractFile["file = parts[parts.length-1]<br/>'settings.yaml'"]
        Prepend["Prepend 'secrets.'<br/>'secrets.settings.yaml'"]
        Join["Join with '/'"]
    end

    subgraph "Secret File Path"
        Secret["'env/teams/demo/secrets.settings.yaml'"]
    end

    Main --> Split
    Split --> ExtractDir
    Split --> ExtractFile
    ExtractFile --> Prepend
    ExtractDir --> Join
    Prepend --> Join
    Join --> Secret
```

---

## Key Takeaways

### In-Memory vs On-Disk
- **FileStore (In-Memory)**: Stores complete objects with secrets merged. Fast access for all operations.
- **Git (On-Disk)**: Stores main files without secrets + separate secret files. Version controlled and encrypted.

### Object Transformation Pattern
```
V2 API: AplRequest → AplTeamObject → FileStore → AplResponse
                     (add label)    (store)      (retrieve)
```

### Secret Handling Pattern
```
Write: Split secrets → Main file + Secret file (on disk)
Load: Merge secrets → Complete object (in memory)
Access: Always use FileStore (has merged secrets)
```

### CRUD Pattern
```
CREATE: Transform → FileStore.set → Git.writeFile → Deploy
READ:   FileStore.get → Transform
UPDATE: Get → Merge → FileStore.set → Git.writeFile → Deploy
DELETE: FileStore.delete → Git.removeFile → Deploy
```
