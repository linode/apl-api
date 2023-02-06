# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.5.22](https://github.com/redkubes/otomi-api/compare/v0.5.21...v0.5.22) (2023-02-06)


### Features

* add falco app ([#363](https://github.com/redkubes/otomi-api/issues/363)) ([e9787ba](https://github.com/redkubes/otomi-api/commit/e9787ba9aad22adb704dea377e16e493f6612dcd))
* configure Kiali resources ([#362](https://github.com/redkubes/otomi-api/issues/362)) ([58a912a](https://github.com/redkubes/otomi-api/commit/58a912a44c64617af44e1575906adaed70b33d1f))
* add thanos app ([#353](https://github.com/redkubes/otomi-api/issues/353)) ([3475885](https://github.com/redkubes/otomi-api/commit/3475885e335f2f73b496cf7c2db0bc9206266f22))
* velero minio ([#349](https://github.com/redkubes/otomi-api/issues/349)) ([57caa4c](https://github.com/redkubes/otomi-api/commit/57caa4c9349c3786fa5a1715ffe240342cf4fcf9))


### Bug Fixes

* do not show authz loading logs ([#356](https://github.com/redkubes/otomi-api/issues/356)) ([2624c75](https://github.com/redkubes/otomi-api/commit/2624c75e6cbe1b3e1e15fcab5f94993e7db73086))
* save brand new secrets files ([#358](https://github.com/redkubes/otomi-api/issues/358)) ([5601356](https://github.com/redkubes/otomi-api/commit/56013568918307847645252078d378ba9470a899)), closes [otomi-core/#975](https://github.com/otomi-core/otomi-api/issues/975)
* Title and description for team monitoring stack ([#360](https://github.com/redkubes/otomi-api/issues/360)) ([9c4907a](https://github.com/redkubes/otomi-api/commit/9c4907aa234c34a39215256e4cd9824cc913933d))

### [0.5.21](https://github.com/redkubes/otomi-api/compare/v0.5.20...v0.5.21) (2023-01-16)


### Features

* add default response headers to ingress config ([#352](https://github.com/redkubes/otomi-api/issues/352)) ([f4b74e7](https://github.com/redkubes/otomi-api/commit/f4b74e7a53a8ecd08b9b3d26c498bf20d92ffde5))
* define ingress-nginx settings for each ingress class ([#354](https://github.com/redkubes/otomi-api/issues/354)) ([ddb44e0](https://github.com/redkubes/otomi-api/commit/ddb44e091662ca579173b6ba3d85e0796cbcf312))


### Bug Fixes

* save brand new secrets files ([#355](https://github.com/redkubes/otomi-api/issues/355)) ([26eaf15](https://github.com/redkubes/otomi-api/commit/26eaf157bee973fe71850b42f2c105374077ba22)), closes [otomi-core/#975](https://github.com/otomi-core/otomi-api/issues/975)


### Reverts

* Revert "fix: save brand new secrets files (#355)" (#357) ([8059a80](https://github.com/redkubes/otomi-api/commit/8059a80bcf01148b51cf122f8512071c0b4c09c3)), closes [#355](https://github.com/redkubes/otomi-api/issues/355) [#357](https://github.com/redkubes/otomi-api/issues/357)


### Others

* locked node version to project ([#351](https://github.com/redkubes/otomi-api/issues/351)) ([5183824](https://github.com/redkubes/otomi-api/commit/5183824ecf318a8ebc70bd3fcce041f15dfa4d8e))

### [0.5.20](https://github.com/redkubes/otomi-api/compare/v0.5.19...v0.5.20) (2022-12-14)


### Features

* Harbor backup ([#343](https://github.com/redkubes/otomi-api/issues/343)) ([b2b983a](https://github.com/redkubes/otomi-api/commit/b2b983a6b51545fac7f790847310a920aa654dca))

### [0.5.19](https://github.com/redkubes/otomi-api/compare/v0.5.18...v0.5.19) (2022-12-06)


### Bug Fixes

* x-secret ([#348](https://github.com/redkubes/otomi-api/issues/348)) ([17f983b](https://github.com/redkubes/otomi-api/commit/17f983b39636bad306e7fa3d9d0839be48701d49))

### [0.5.18](https://github.com/redkubes/otomi-api/compare/v0.5.17...v0.5.18) (2022-12-05)


### Bug Fixes

* treat isShared flag as optional ([#347](https://github.com/redkubes/otomi-api/issues/347)) ([550413c](https://github.com/redkubes/otomi-api/commit/550413c0f0ccd5b338cbf24b7ba27295ed702e4d))

### [0.5.17](https://github.com/redkubes/otomi-api/compare/v0.5.16...v0.5.17) (2022-12-05)


### Features

* add a flag to disable monitoring stack for a specific team ([#340](https://github.com/redkubes/otomi-api/issues/340)) ([5138dee](https://github.com/redkubes/otomi-api/commit/5138dee7f3e7759e34ab5fa32df02ae5ed3c1d3c))
* add minio app ([#345](https://github.com/redkubes/otomi-api/issues/345)) ([2701cfb](https://github.com/redkubes/otomi-api/commit/2701cfbbbcb495992bc57aa97cf6fa53c42a2115))
* prometheus remote write ([#344](https://github.com/redkubes/otomi-api/issues/344)) ([bb4e912](https://github.com/redkubes/otomi-api/commit/bb4e912d37ad38ff27f81f27942503db49166661))


### Bug Fixes

* ensure that root repo is loaded ([#342](https://github.com/redkubes/otomi-api/issues/342)) ([f7e5e83](https://github.com/redkubes/otomi-api/commit/f7e5e835679e44eaacb5bbf8bc5db7acc024e19a))

### [0.5.16](https://github.com/redkubes/otomi-api/compare/v0.5.15...v0.5.16) (2022-11-18)


### Features

* detect git conflicts on multi-user values changes ([#334](https://github.com/redkubes/otomi-api/issues/334)) ([a09de9c](https://github.com/redkubes/otomi-api/commit/a09de9c104dfd31c8ec8592c6724d3d3a374c9e2))


### Bug Fixes

* certman resources ([#337](https://github.com/redkubes/otomi-api/issues/337)) ([f794106](https://github.com/redkubes/otomi-api/commit/f794106d04d6df27f14be9fde4d5c6eaf5d32f67))
* do not remove /tmp/otomi/values dir ([#338](https://github.com/redkubes/otomi-api/issues/338)) ([ab3a7d1](https://github.com/redkubes/otomi-api/commit/ab3a7d1928f9c82d89ead6f4ec612643ac72a2bf))
* prevent regression ([2136ce7](https://github.com/redkubes/otomi-api/commit/2136ce7a980b9106b68e3eac1c98bb9fa9b51e47))
* **schema:** add certmanager resources to schema ([#335](https://github.com/redkubes/otomi-api/issues/335)) ([e64634c](https://github.com/redkubes/otomi-api/commit/e64634c445f3cab76e408795f2cbb6d5e9a08267))

### [0.5.15](https://github.com/redkubes/otomi-api/compare/v0.5.14...v0.5.15) (2022-09-27)


### Bug Fixes

* clone repo after application is ready ([#333](https://github.com/redkubes/otomi-api/issues/333)) ([d303841](https://github.com/redkubes/otomi-api/commit/d303841a205bc0311270734420f652789d10057e)), closes [redkubes/otomi-core#913](https://github.com/redkubes/otomi-core/issues/913)

### [0.5.14](https://github.com/redkubes/otomi-api/compare/v0.5.13...v0.5.14) (2022-09-23)


### Features

* add velero to platform apps ([#329](https://github.com/redkubes/otomi-api/issues/329)) ([d1b8972](https://github.com/redkubes/otomi-api/commit/d1b8972d0a33c328dfecb0afafa57868c22a42a4))
* attribute based access control, default values ([#326](https://github.com/redkubes/otomi-api/issues/326)) ([da03217](https://github.com/redkubes/otomi-api/commit/da03217364060f0b86233bb56c5f9115fdda0a6e))
* improve attribute based access control ([#325](https://github.com/redkubes/otomi-api/issues/325)) ([ff6e8bc](https://github.com/redkubes/otomi-api/commit/ff6e8bcfc24034ef2b2d68499d76965f15a98031))
* mock user group membership ([#327](https://github.com/redkubes/otomi-api/issues/327)) ([824b986](https://github.com/redkubes/otomi-api/commit/824b986c810fcaded4e9b2f48ca516bff606b233))
* yaml editor for dns provider 'other' ([#324](https://github.com/redkubes/otomi-api/issues/324)) ([fb8e215](https://github.com/redkubes/otomi-api/commit/fb8e2151db6cb6d6f006f7849d730477909e6308))


### Bug Fixes

* app update ([#328](https://github.com/redkubes/otomi-api/issues/328)) ([26dcfe2](https://github.com/redkubes/otomi-api/commit/26dcfe256b7a7ab8f8eda78949a7a5b69365b6c7))
* grafana required properties ([#331](https://github.com/redkubes/otomi-api/issues/331)) ([1da5b1e](https://github.com/redkubes/otomi-api/commit/1da5b1ee84b0c8ce8dda26845bd3b6f9ee57aded))
* grafana, harbor and kubeclarity schemas ([#332](https://github.com/redkubes/otomi-api/issues/332)) ([2164950](https://github.com/redkubes/otomi-api/commit/216495093e86aaceda54693c115947dfa1a0a52a))
* loki app oneOf cannot be a root property in the form ([#330](https://github.com/redkubes/otomi-api/issues/330)) ([e1e4fea](https://github.com/redkubes/otomi-api/commit/e1e4feadd8776cbc4305196319ab8d180f720f60))
* otomi settings form ([64c9963](https://github.com/redkubes/otomi-api/commit/64c996352b75e930669c0183f82c6f299aff3b2e))

### [0.5.13](https://github.com/redkubes/otomi-api/compare/v0.5.12...v0.5.13) (2022-08-24)


### Features

* add new providers ([#322](https://github.com/redkubes/otomi-api/issues/322)) ([8751ed0](https://github.com/redkubes/otomi-api/commit/8751ed094aaeb420fe1b43ce1718e5f488815a04))
* schema and related logic grooming ([#320](https://github.com/redkubes/otomi-api/issues/320)) ([846c420](https://github.com/redkubes/otomi-api/commit/846c420b900476cef42e8a7202d9d2da97a1c513)), closes [redkubes/unassigned-issues#442](https://github.com/redkubes/unassigned-issues/issues/442)


### Bug Fixes

* removed unused schema fields, updated doc links ([#323](https://github.com/redkubes/otomi-api/issues/323)) ([37f85f5](https://github.com/redkubes/otomi-api/commit/37f85f506c436a5917f93ec10d19c4bb2e0c4327))

### [0.5.12](https://github.com/redkubes/otomi-api/compare/v0.5.11...v0.5.12) (2022-07-27)


### Bug Fixes

* azure vault unseal ([#316](https://github.com/redkubes/otomi-api/issues/316)) ([7916f15](https://github.com/redkubes/otomi-api/commit/7916f151003e10c52624e54e64c69ad6328da37a))
* regexp for responders ([#318](https://github.com/redkubes/otomi-api/issues/318)) ([5158f5b](https://github.com/redkubes/otomi-api/commit/5158f5b6a7cdf124bd7013baa9358be314c857c2))

### [0.5.11](https://github.com/redkubes/otomi-api/compare/v0.5.10...v0.5.11) (2022-07-05)


### Bug Fixes

* dns schema to match core [ci skip] ([c78d93c](https://github.com/redkubes/otomi-api/commit/c78d93c1b5663bbfdd15103db13973d6ab5e466a))

### [0.5.10](https://github.com/redkubes/otomi-api/compare/v0.5.9...v0.5.10) (2022-07-03)


### Features

* otomi.nodeselector, schema additions ([58ee5a2](https://github.com/redkubes/otomi-api/commit/58ee5a2ae12ce00dfee0c74f1aad9a3234e2bf9b))

### [0.5.9](https://github.com/redkubes/otomi-api/compare/v0.5.8...v0.5.9) (2022-06-27)


### Bug Fixes

* file path regex, svc domain deflate, default value removed ([4320a5f](https://github.com/redkubes/otomi-api/commit/4320a5f8dd6f0ac0ddca9b1e38a6b7a9e1c6567f))
* regression team selfservice, cluster fields editable ([486ee1b](https://github.com/redkubes/otomi-api/commit/486ee1b33eb37cfd29c275602a39ba68a6117273))

### [0.5.8](https://github.com/redkubes/otomi-api/compare/v0.5.7...v0.5.8) (2022-06-13)


### Features

* ingress class ([#315](https://github.com/redkubes/otomi-api/issues/315)) ([1834ae9](https://github.com/redkubes/otomi-api/commit/1834ae963012b03d71e12956f0f490d082ed2531))
* kubeclarity ([#310](https://github.com/redkubes/otomi-api/issues/310)) ([57c6c5f](https://github.com/redkubes/otomi-api/commit/57c6c5f88a6b5ec602f8e637e16652aea0c00f06))


### Code Refactoring

* **component:** refactor tests and regenerate fixtures ([#313](https://github.com/redkubes/otomi-api/issues/313)) ([2f177ca](https://github.com/redkubes/otomi-api/commit/2f177ca38b17d38ec09c9e85ffa74f39ae9bf24a))

### [0.5.7](https://github.com/redkubes/otomi-api/compare/v0.5.6...v0.5.7) (2022-05-23)


### Others

* **deps:** update dependency cspell to v5.21.1 ([150131a](https://github.com/redkubes/otomi-api/commit/150131a2dfdf785700fbfece675f328c5c0c1661))
* **deps:** update dependency cspell to v5.21.2 ([91536fa](https://github.com/redkubes/otomi-api/commit/91536fa7d602a976795e774488299f09a06caadc))


### Docs

* ingressPrivate description ([f5032f0](https://github.com/redkubes/otomi-api/commit/f5032f0b3e5fdafe555c8ded2eb7c8b9a4ee90f7))

### [0.5.6](https://github.com/redkubes/otomi-api/compare/v0.5.5...v0.5.6) (2022-05-18)


### Bug Fixes

* regexp for URL path ([#302](https://github.com/redkubes/otomi-api/issues/302)) ([79c933a](https://github.com/redkubes/otomi-api/commit/79c933a6b509ce4ce4089f6f6707f8227da92dfa))
* schema ([843ad11](https://github.com/redkubes/otomi-api/commit/843ad110eddeffee29eec2321134e046244b99ba))


### Others

* **deps:** update all-npm ([b436b00](https://github.com/redkubes/otomi-api/commit/b436b007cc6b651735ec3c4626fbb975434e73ea))
* **deps:** update dependency @commitlint/cli to v16.3.0 ([529d123](https://github.com/redkubes/otomi-api/commit/529d12340bd3beed3ecee3f76a292c661acee88a))
* **deps:** update dependency @types/node to v16.11.35 ([2b627b9](https://github.com/redkubes/otomi-api/commit/2b627b985545a3faf1cbab492d84274b0b23ff3f))
* **deps:** update dependency @types/node to v16.11.36 ([c2ba111](https://github.com/redkubes/otomi-api/commit/c2ba11182b3eb91cfc89f1325dc63a38cee421bc))
* **deps:** update dependency cspell to v5.21.0 ([4cea482](https://github.com/redkubes/otomi-api/commit/4cea482bc66475eeb76a4c94ab83ce7ee98856fa))
* **deps:** update dependency git-cz to v4.9.0 ([182e5f9](https://github.com/redkubes/otomi-api/commit/182e5f9548c0ba5a8db54e2eadabdf5e18cae5f5))
* **deps:** update dependency standard-version to v9.5.0 ([4c72d78](https://github.com/redkubes/otomi-api/commit/4c72d78862929731dcb6a05b259e999997c5cebc))

### [0.5.5](https://github.com/redkubes/otomi-api/compare/v0.5.4...v0.5.5) (2022-05-05)


### Features

* argocd app ([#300](https://github.com/redkubes/otomi-api/issues/300)) ([19eb854](https://github.com/redkubes/otomi-api/commit/19eb85486a1fe0789ed9db6c49848947e4b3f7da))
* pr lint action [ci skip] ([d50b18c](https://github.com/redkubes/otomi-api/commit/d50b18ca1bff637c0d0c6b284e70ccbee12262e7))


### Others

* **deps:** update all-npm ([#298](https://github.com/redkubes/otomi-api/issues/298)) ([8a1a126](https://github.com/redkubes/otomi-api/commit/8a1a1263ea38b012610a2343af3f0dc6c58c6797))
* **deps:** update dependency @redocly/openapi-cli to v1.0.0-beta.95 ([73d967a](https://github.com/redkubes/otomi-api/commit/73d967a4e5741eac52c17b8f2eb7fc7028d4dc3e))

### [0.5.4](https://github.com/redkubes/otomi-api/compare/v0.5.3...v0.5.4) (2022-04-29)


### Bug Fixes

* **deps:** update dependency @kubernetes/client-node to ^0.16.0 ([#285](https://github.com/redkubes/otomi-api/issues/285)) ([250de8e](https://github.com/redkubes/otomi-api/commit/250de8ee961c12bf777eae3660fbb8f304e4efbe))
* **deps:** update dependency axios to ^0.26.0 ([#286](https://github.com/redkubes/otomi-api/issues/286)) ([093835a](https://github.com/redkubes/otomi-api/commit/093835ae8cba0384414412388f239651bb7cc420))
* **deps:** update dependency simple-git to v3 [security] ([#267](https://github.com/redkubes/otomi-api/issues/267)) ([26c39cb](https://github.com/redkubes/otomi-api/commit/26c39cbacc5933872995f109d73fa6edc732d401))
* missing load ([256984e](https://github.com/redkubes/otomi-api/commit/256984e498e66363fbbfd0c83f6f29fbc9765348))
* no more npm token requirement for build [ci skip] ([9260cd2](https://github.com/redkubes/otomi-api/commit/9260cd2dceeaf224ee769b3ab57271278f911970))
* python now 3 ([aef209b](https://github.com/redkubes/otomi-api/commit/aef209b8d39bb8cb8bafb2037403b7850239a315))
* race condition for reading api spec ([a8dc47d](https://github.com/redkubes/otomi-api/commit/a8dc47d5c4c10765cedf55ca8844e0c897dafaf1))
* warning about api redefinition ([#266](https://github.com/redkubes/otomi-api/issues/266)) ([e50b348](https://github.com/redkubes/otomi-api/commit/e50b34863c75f025c828d835ec5b4afe5ce5334f))
* yaml upgrade ([380f3a1](https://github.com/redkubes/otomi-api/commit/380f3a10817ddfdbc2ec5c3d0eed02cbed47c7f8))


### Build System

* adding renovate schema [ci skip] ([289c641](https://github.com/redkubes/otomi-api/commit/289c64143e65b086f046fb2410615f67100aeb99))
* **models:** build models for renovate ([1d52f5f](https://github.com/redkubes/otomi-api/commit/1d52f5fffd1d1b8bb98590915c7c27d18787bf19))
* **models:** fix config for renovate ([c157176](https://github.com/redkubes/otomi-api/commit/c157176db3c21ffec8064de07b4689af391006bf))
* **models:** fix config for renovate ([20a770f](https://github.com/redkubes/otomi-api/commit/20a770fa8ee1a499560eed8c3a54e3b10bef43d7))
* **models:** fix config for renovate ([8f8f75e](https://github.com/redkubes/otomi-api/commit/8f8f75e67b8d188ee31a656e3caa1ea6e59d3f81))
* remove self hosted renovate [ci skip] ([2a79ea1](https://github.com/redkubes/otomi-api/commit/2a79ea1f46a014f49a65113fcdaecb64ffc2d07b))
* remove self hosted renovate [ci skip] ([6566dbe](https://github.com/redkubes/otomi-api/commit/6566dbed07aa5625232bdaa4ba04aa46a2a13d8c))
* renamed renovate shared config repo [ci skip] ([b6c49da](https://github.com/redkubes/otomi-api/commit/b6c49da2caf0f760e17f373653ffc541ad9fcd8f))


### Code Refactoring

* master refs to main ([6588964](https://github.com/redkubes/otomi-api/commit/6588964f14e4799ab824440d82cf14877fc7837e))


### Others

* **deps:** pin dependencies ([#268](https://github.com/redkubes/otomi-api/issues/268)) ([72b17a6](https://github.com/redkubes/otomi-api/commit/72b17a6b529e0be3ec10dda7f341e6bff0ffc938))
* **deps:** update actions/checkout action to v3 ([#287](https://github.com/redkubes/otomi-api/issues/287)) ([2e16628](https://github.com/redkubes/otomi-api/commit/2e166287a8a9f8ac7edc400ddc2d8fe8db3825a6))
* **deps:** update commitlint monorepo ([#288](https://github.com/redkubes/otomi-api/issues/288)) ([264af06](https://github.com/redkubes/otomi-api/commit/264af065181e32ef3b461358448afd37b35e6869))
* **deps:** update dependency @redocly/openapi-cli to v1.0.0-beta.94 ([#271](https://github.com/redkubes/otomi-api/issues/271)) ([cbbe717](https://github.com/redkubes/otomi-api/commit/cbbe7172cdcc8d090ff45ec5c7cc7d54ab12f0f7))
* **deps:** update dependency @types/chai to v4.3.1 ([#276](https://github.com/redkubes/otomi-api/issues/276)) ([bed4b2e](https://github.com/redkubes/otomi-api/commit/bed4b2e268fe76b9757bd2b174f2f6a2fbe80174))
* **deps:** update dependency @types/lodash to v4.14.181 ([#272](https://github.com/redkubes/otomi-api/issues/272)) ([dec0c4c](https://github.com/redkubes/otomi-api/commit/dec0c4c16c424e9bb581487a2cdc57426fdc3506))
* **deps:** update dependency @types/node to v16 ([#289](https://github.com/redkubes/otomi-api/issues/289)) ([8e129f5](https://github.com/redkubes/otomi-api/commit/8e129f5911c2525e5d4d342bd6b5f835d1b3c6a6))
* **deps:** update dependency @types/sinon to v10 ([#290](https://github.com/redkubes/otomi-api/issues/290)) ([624c0e2](https://github.com/redkubes/otomi-api/commit/624c0e2478b4a9b86df61f1019ea22bcc036733c))
* **deps:** update dependency @types/supertest to v2.0.12 ([#274](https://github.com/redkubes/otomi-api/issues/274)) ([18851d2](https://github.com/redkubes/otomi-api/commit/18851d25217a96e76b13a335525d8498cf1af408))
* **deps:** update dependency cspell to v5.19.7 ([#277](https://github.com/redkubes/otomi-api/issues/277)) ([7ff5fe2](https://github.com/redkubes/otomi-api/commit/7ff5fe266be3e8c00fbbae8c926cf94328a8ff52))
* **deps:** update dependency dotenv to v16 ([#291](https://github.com/redkubes/otomi-api/issues/291)) ([dbdf461](https://github.com/redkubes/otomi-api/commit/dbdf461aa37ee4bee93295a666e232f86810ed32))
* **deps:** update dependency eslint-config-prettier to v8 ([#293](https://github.com/redkubes/otomi-api/issues/293)) ([0254a04](https://github.com/redkubes/otomi-api/commit/0254a04ee328709f4e2c5cc5a0440d36006739ff))
* **deps:** update dependency eslint-plugin-chai-friendly to v0.7.2 ([#278](https://github.com/redkubes/otomi-api/issues/278)) ([7fdfcd0](https://github.com/redkubes/otomi-api/commit/7fdfcd07166f48f61422fa6897e491ad5cad86de))
* **deps:** update dependency prettier to v2.6.2 ([#280](https://github.com/redkubes/otomi-api/issues/280)) ([62c68cf](https://github.com/redkubes/otomi-api/commit/62c68cfe5e0bbb047afd70ed91f9223c308c3caf))
* **deps:** update dependency supports-color to v9.2.2 ([#273](https://github.com/redkubes/otomi-api/issues/273)) ([d092dbe](https://github.com/redkubes/otomi-api/commit/d092dbe264f3449067474bc77b17d15d6ce2d2cc))
* **deps:** update dependency typescript to v4.6.3 ([#281](https://github.com/redkubes/otomi-api/issues/281)) ([8d5bd5a](https://github.com/redkubes/otomi-api/commit/8d5bd5aaeada750e32bc11bba56f723342a2d17a))
* **deps:** update node.js to v14.19 ([#284](https://github.com/redkubes/otomi-api/issues/284)) ([8d1e6f3](https://github.com/redkubes/otomi-api/commit/8d1e6f313c3b8babd676c493e34bca1a7f4260ad))


### CI

* **codeowners:** put back [ci skip] ([6ee4925](https://github.com/redkubes/otomi-api/commit/6ee49252e968fcbd0e8d77a12ca4d190d8e0ed33))
* **renovate:** added app/renovate-approve to codeowners for packages [ci skip] ([f16113e](https://github.com/redkubes/otomi-api/commit/f16113e205181b9d71d08d70d88bd47972cfaf02))
* **renovate:** group name [ci skip] ([2b14460](https://github.com/redkubes/otomi-api/commit/2b1446023e01fbe74daeb4f799d80ea9ed23aa7f))
* **renovate:** removed codeowners to autoapprove by renovate, grouped all [ci skip] ([3cf1837](https://github.com/redkubes/otomi-api/commit/3cf18374e8e7341b54d58af8fe4b25200bf6b871))
* **renovate:** removed groupName [ci skip] ([0e92a3d](https://github.com/redkubes/otomi-api/commit/0e92a3d427b21f71b43b622d0ebdb6df208ae821))
* **renovate:** removed redkubesbot from codeowners [ci skip] ([e22b6f2](https://github.com/redkubes/otomi-api/commit/e22b6f24a966b141eebd899d3c3e416bb1e688d3))

### [0.5.3](https://github.com/redkubes/otomi-api/compare/v0.5.2...v0.5.3) (2022-04-11)


### Features

* admin services ([425a836](https://github.com/redkubes/otomi-api/commit/425a8366fe9942bb00d269a067d667cc183f8c2b))


### Bug Fixes

* admin team also saved ([4c73108](https://github.com/redkubes/otomi-api/commit/4c73108b950fae5c2ae0f48b1bbede82cf6d02fc))
* admin team not in get list ([2bb032b](https://github.com/redkubes/otomi-api/commit/2bb032bf6014648f777fc1f11cba06d3f98c8f89))
* no admin team in teams list ([e1f8eec](https://github.com/redkubes/otomi-api/commit/e1f8eecded2a9afa852aa45f0798a211ab5db8b3))
* onprem now custom [ci skip] ([fec251f](https://github.com/redkubes/otomi-api/commit/fec251f70f3424809e91203cfca7f1e48c3290cb))
* tests ([68f0a4f](https://github.com/redkubes/otomi-api/commit/68f0a4fd7d32db5ab08e0ea635e9e698a5737520))

### [0.5.2](https://github.com/redkubes/otomi-api/compare/v0.5.1...v0.5.2) (2022-04-09)


### Bug Fixes

* async errors no more blocking express ([a354069](https://github.com/redkubes/otomi-api/commit/a3540695308ee4d32b8b75e4879fbc09ff63d435))

### [0.5.1](https://github.com/redkubes/otomi-api/compare/v0.4.95...v0.5.1) (2022-04-07)


### Features

* shortcuts ([#245](https://github.com/redkubes/otomi-api/issues/245)) ([0c65119](https://github.com/redkubes/otomi-api/commit/0c651197bf83624d29c7ac85c99852054338507a))

### [0.4.95](https://github.com/redkubes/otomi-api/compare/v0.4.93...v0.4.95) (2022-04-05)


### Bug Fixes

* update schema regex for secrets ([#264](https://github.com/redkubes/otomi-api/issues/264)) ([6c56021](https://github.com/redkubes/otomi-api/commit/6c560219e31b6ad27577baa58d6eed0bc35963fa))
* **modify message:** modify error message when the user gets a service duplication error ([#262](https://github.com/redkubes/otomi-api/issues/262)) ([0773056](https://github.com/redkubes/otomi-api/commit/0773056682889577f92a1bed16b3d206b995ef75))
* service ingress paths ([#260](https://github.com/redkubes/otomi-api/issues/260)) ([0d62d03](https://github.com/redkubes/otomi-api/commit/0d62d0391aac473047eae8172900b5f72bc5624c)), closes [#259](https://github.com/redkubes/otomi-api/issues/259)
* **avoid insert duplicated service inside a team:** ([#255](https://github.com/redkubes/otomi-api/issues/255)) ([4cf2c19](https://github.com/redkubes/otomi-api/commit/4cf2c19a3cc67cc8e8c82d055567bc7c5de1cafc)), closes [#246](https://github.com/redkubes/otomi-api/issues/246)
* **deps:** pin dependencies ([#240](https://github.com/redkubes/otomi-api/issues/240)) ([30c3d6e](https://github.com/redkubes/otomi-api/commit/30c3d6ebbae3f4f0f5b71bfa5600a1dc31a0a40c))
* **fix ismultitenant false issue:** add isMultitenant flag to Session ([#232](https://github.com/redkubes/otomi-api/issues/232)) ([273a2dc](https://github.com/redkubes/otomi-api/commit/273a2dcb7697be4986f6639c9c499cf2534721eb))


### CI

* **deps:** renovate automerge for patches ([aa8bdc8](https://github.com/redkubes/otomi-api/commit/aa8bdc8ede789c3a4b9837b625b6009344b20a9a))
* **deps:** renovate self hosted with pat for automerge [ci skip] ([c64d448](https://github.com/redkubes/otomi-api/commit/c64d4488cf7054bd870ff1075e3178eba8480a87))


### Others

* **deps:** add renovate.json ([#239](https://github.com/redkubes/otomi-api/issues/239)) ([b50b4c8](https://github.com/redkubes/otomi-api/commit/b50b4c8b711b4228995a9966232be87c2e3891b0))
* **deps:** bump object-path from 0.11.5 to 0.11.8 ([#236](https://github.com/redkubes/otomi-api/issues/236)) ([af02f6b](https://github.com/redkubes/otomi-api/commit/af02f6bb22ff6aceb43b5a3a0258cd8bbb90be72))
* **deps:** bump trim-off-newlines from 1.0.1 to 1.0.3 ([#238](https://github.com/redkubes/otomi-api/issues/238)) ([87974cd](https://github.com/redkubes/otomi-api/commit/87974cd7dbbc316584ab9fab9e4dec53d3e75dad))
* **deps:** bump validator from 13.6.0 to 13.7.0 ([#237](https://github.com/redkubes/otomi-api/issues/237)) ([e4c33b1](https://github.com/redkubes/otomi-api/commit/e4c33b1b6e4ac9d77fabc0ee230523c99d8cc519))
* **prerelease:** npm client ([#261](https://github.com/redkubes/otomi-api/issues/261)) ([819ace7](https://github.com/redkubes/otomi-api/commit/819ace7493dfd8e5e135a94ec8a266efe9503581))
* **release:** 0.4.94 ([23fc553](https://github.com/redkubes/otomi-api/commit/23fc553cc0e4457e043c5b9bf32664ebbe7e231b))

### [0.4.94](https://github.com/redkubes/otomi-api/compare/v0.4.93...v0.4.94) (2022-02-24)


### Bug Fixes

* **modify message:** modify error message when the user gets a service duplication error ([#262](https://github.com/redkubes/otomi-api/issues/262)) ([0773056](https://github.com/redkubes/otomi-api/commit/0773056682889577f92a1bed16b3d206b995ef75))
* service ingress paths ([#260](https://github.com/redkubes/otomi-api/issues/260)) ([0d62d03](https://github.com/redkubes/otomi-api/commit/0d62d0391aac473047eae8172900b5f72bc5624c)), closes [#259](https://github.com/redkubes/otomi-api/issues/259)
* **avoid insert duplicated service inside a team:** ([#255](https://github.com/redkubes/otomi-api/issues/255)) ([4cf2c19](https://github.com/redkubes/otomi-api/commit/4cf2c19a3cc67cc8e8c82d055567bc7c5de1cafc)), closes [#246](https://github.com/redkubes/otomi-api/issues/246)
* **deps:** pin dependencies ([#240](https://github.com/redkubes/otomi-api/issues/240)) ([30c3d6e](https://github.com/redkubes/otomi-api/commit/30c3d6ebbae3f4f0f5b71bfa5600a1dc31a0a40c))
* **fix ismultitenant false issue:** add isMultitenant flag to Session ([#232](https://github.com/redkubes/otomi-api/issues/232)) ([273a2dc](https://github.com/redkubes/otomi-api/commit/273a2dcb7697be4986f6639c9c499cf2534721eb))


### CI

* **deps:** renovate automerge for patches ([aa8bdc8](https://github.com/redkubes/otomi-api/commit/aa8bdc8ede789c3a4b9837b625b6009344b20a9a))
* **deps:** renovate self hosted with pat for automerge [ci skip] ([c64d448](https://github.com/redkubes/otomi-api/commit/c64d4488cf7054bd870ff1075e3178eba8480a87))


### Others

* **deps:** add renovate.json ([#239](https://github.com/redkubes/otomi-api/issues/239)) ([b50b4c8](https://github.com/redkubes/otomi-api/commit/b50b4c8b711b4228995a9966232be87c2e3891b0))
* **deps:** bump object-path from 0.11.5 to 0.11.8 ([#236](https://github.com/redkubes/otomi-api/issues/236)) ([af02f6b](https://github.com/redkubes/otomi-api/commit/af02f6bb22ff6aceb43b5a3a0258cd8bbb90be72))
* **deps:** bump trim-off-newlines from 1.0.1 to 1.0.3 ([#238](https://github.com/redkubes/otomi-api/issues/238)) ([87974cd](https://github.com/redkubes/otomi-api/commit/87974cd7dbbc316584ab9fab9e4dec53d3e75dad))
* **deps:** bump validator from 13.6.0 to 13.7.0 ([#237](https://github.com/redkubes/otomi-api/issues/237)) ([e4c33b1](https://github.com/redkubes/otomi-api/commit/e4c33b1b6e4ac9d77fabc0ee230523c99d8cc519))
* **prerelease:** npm client ([#261](https://github.com/redkubes/otomi-api/issues/261)) ([819ace7](https://github.com/redkubes/otomi-api/commit/819ace7493dfd8e5e135a94ec8a266efe9503581))

### [0.4.93](https://github.com/redkubes/otomi-api/compare/v0.4.92...v0.4.93) (2022-02-02)


### Features

* enhance network policy descriptions ([#234](https://github.com/redkubes/otomi-api/issues/234)) ([566cf0d](https://github.com/redkubes/otomi-api/commit/566cf0d02de4f4b5d5f1ed2244c53090daacfc6e))


### Bug Fixes

* **bug 226 github:** Move password creation functionality to team creation ([#229](https://github.com/redkubes/otomi-api/issues/229)) ([96d8176](https://github.com/redkubes/otomi-api/commit/96d8176961fdcda671476db614104b471b06fe51))

### [0.4.92](https://github.com/redkubes/otomi-api/compare/v0.4.91...v0.4.92) (2022-01-26)


### Bug Fixes

* package lock issue ([c86bddf](https://github.com/redkubes/otomi-api/commit/c86bddf45233ff440177873b52e70e440ad1a82a))

### [0.4.91](https://github.com/redkubes/otomi-api/compare/v0.4.90...v0.4.91) (2022-01-26)


### Others

* **deps:** bump shelljs from 0.8.4 to 0.8.5 ([#227](https://github.com/redkubes/otomi-api/issues/227)) ([acc4625](https://github.com/redkubes/otomi-api/commit/acc46253de76fb904a06fc7efa23958c1a870fbf))

### [0.4.90](https://github.com/redkubes/otomi-api/compare/v0.4.89...v0.4.90) (2022-01-02)


### Bug Fixes

* resource pattern [ci skip] ([97abdc1](https://github.com/redkubes/otomi-api/commit/97abdc1cd75cd27916c9aa8277fc1ccf507d096a))

### [0.4.89](https://github.com/redkubes/otomi-api/compare/v0.4.88...v0.4.89) (2022-01-02)


### Bug Fixes

* idname, resource validation ([ca514a3](https://github.com/redkubes/otomi-api/commit/ca514a3cb83fa39e1a9a9403d8fac14b0201f41d))

### [0.4.88](https://github.com/redkubes/otomi-api/compare/v0.4.87...v0.4.88) (2022-01-01)


### Bug Fixes

* local test env, missing definition change ([ac7bd04](https://github.com/redkubes/otomi-api/commit/ac7bd041517e0913f80c0646e2b61b59521010a7))

### [0.4.87](https://github.com/redkubes/otomi-api/compare/v0.4.85...v0.4.87) (2021-12-31)


### Bug Fixes

* settings merge for policies, added runAsNonRoot, shuffled service<>ingress ([4873d4c](https://github.com/redkubes/otomi-api/commit/4873d4c59932a239a2223eebd665fe497158027a))


### Code Refactoring

* removed autoCD, reordered service items [ci skip] ([e21166a](https://github.com/redkubes/otomi-api/commit/e21166ac2e491eb9a4d5223c8dfead7d28361fcb))


### Others

* **release:** 0.4.86 ([fd775a7](https://github.com/redkubes/otomi-api/commit/fd775a7230a36c82a0c783e89439d258d64294bd))

### [0.4.86](https://github.com/redkubes/otomi-api/compare/v0.4.85...v0.4.86) (2021-12-30)


### Bug Fixes

* settings merge for policies, added runAsNonRoot, shuffled service<>ingress ([4873d4c](https://github.com/redkubes/otomi-api/commit/4873d4c59932a239a2223eebd665fe497158027a))


### Code Refactoring

* removed autoCD, reordered service items [ci skip] ([e21166a](https://github.com/redkubes/otomi-api/commit/e21166ac2e491eb9a4d5223c8dfead7d28361fcb))

### [0.4.85](https://github.com/redkubes/otomi-api/compare/v0.4.84...v0.4.85) (2021-12-02)


### Code Refactoring

* push to dockerhub ([#225](https://github.com/redkubes/otomi-api/issues/225)) ([e3ccaf4](https://github.com/redkubes/otomi-api/commit/e3ccaf430f87fd51156bc86ca629fc33be1ede29))

### [0.4.84](https://github.com/redkubes/otomi-api/compare/v0.4.83...v0.4.84) (2021-11-16)


### Bug Fixes

* cert arn and name ([#223](https://github.com/redkubes/otomi-api/issues/223)) ([a64adad](https://github.com/redkubes/otomi-api/commit/a64adad173b823bf5c5789abe2fd42d456b49514))


### Others

* **deps-dev:** bump @redocly/openapi-cli [ci skip] ([#221](https://github.com/redkubes/otomi-api/issues/221)) ([258dfa9](https://github.com/redkubes/otomi-api/commit/258dfa98cd02701b6b7941ba2600cb6293a4ebb7))
* **release:** 0.4.83 ([c920056](https://github.com/redkubes/otomi-api/commit/c9200565759d283e10eba1b39ab800b234d7d0da))

### [0.4.83](https://github.com/redkubes/otomi-api/compare/v0.4.82...v0.4.83) (2021-11-10)

### [0.4.82](https://github.com/redkubes/otomi-api/compare/v0.4.81...v0.4.82) (2021-11-09)


### Bug Fixes

* dupe logic ([a29b2c6](https://github.com/redkubes/otomi-api/commit/a29b2c64c7e2732f79f97e25e260cfe7b662b298))
* dupe url check should only run on create ([6bb2568](https://github.com/redkubes/otomi-api/commit/6bb25682dcfd8c54be44b4d15c54da6820176189))
* missing schema entries [ci skip] ([10ec7af](https://github.com/redkubes/otomi-api/commit/10ec7af5de54ed1d161b8bfc410d045706f88d97))

### [0.4.81](https://github.com/redkubes/otomi-api/compare/v0.4.80...v0.4.81) (2021-11-05)


### Features

* added ca to session [ci skip] ([c7ed873](https://github.com/redkubes/otomi-api/commit/c7ed873f6bcdf0d9ce20ee6a303cd0b5358326fb))


### Bug Fixes

* default username claim mapper [ci skip] ([850f036](https://github.com/redkubes/otomi-api/commit/850f03600e7fca257a27e024a96a967b1c4b870e))

### [0.4.80](https://github.com/redkubes/otomi-api/compare/v0.4.79...v0.4.80) (2021-11-03)


### Bug Fixes

* race condition when checking sops yaml existence ([b4a4dd7](https://github.com/redkubes/otomi-api/commit/b4a4dd70b2cfa136d9f816080eebb2bef90d2755))

### [0.4.79](https://github.com/redkubes/otomi-api/compare/v0.4.78...v0.4.79) (2021-11-02)


### Features

* selfservice kubecfg ([#219](https://github.com/redkubes/otomi-api/issues/219)) ([6e01c11](https://github.com/redkubes/otomi-api/commit/6e01c118495c2e25256b3ddd26394d4e5d9434f8))

### [0.4.78](https://github.com/redkubes/otomi-api/compare/v0.4.77...v0.4.78) (2021-11-01)


### Bug Fixes

* wrong logic for skipping processing ([4385043](https://github.com/redkubes/otomi-api/commit/438504342adbc3d136d7f732c2fa5d7842d081d4))

### [0.4.77](https://github.com/redkubes/otomi-api/compare/v0.4.76...v0.4.77) (2021-10-31)


### Bug Fixes

* dev flags [ci skip] ([b75bc1e](https://github.com/redkubes/otomi-api/commit/b75bc1e470907c16ce49b5a6388be37c0d8e8473))
* duplicate url check now discarding editing mode [fixes ([36aec11](https://github.com/redkubes/otomi-api/commit/36aec112210f4ba9e1d53758b67c73791c333d5b)), closes [redkubes/unassigned-issues#342](https://github.com/redkubes/unassigned-issues/issues/342)

### [0.4.76](https://github.com/redkubes/otomi-api/compare/v0.4.74...v0.4.76) (2021-10-13)


### Bug Fixes

* always process data on deploy, renamed encrypt func to process [ci skip] ([e229101](https://github.com/redkubes/otomi-api/commit/e229101a9b8cba418d4f3444b887942fbe36f480))
* duplicate urls ([#217](https://github.com/redkubes/otomi-api/issues/217)) ([ddd982e](https://github.com/redkubes/otomi-api/commit/ddd982ef879be6c104256de79dc788e83fbc9fb1))
* hasExternalIDP needed to be added to schema [ci skip] ([4eb4509](https://github.com/redkubes/otomi-api/commit/4eb45091e5ac9db2cbeb783d05790fd012adf744))


### Others

* **release:** 0.4.75 ([288dcd8](https://github.com/redkubes/otomi-api/commit/288dcd8729ca642cde2f93b30aee691fb1faf3ed))

### [0.4.75](https://github.com/redkubes/otomi-api/compare/v0.4.74...v0.4.75) (2021-10-09)


### Bug Fixes

* always process data on deploy, renamed encrypt func to process [ci skip] ([e229101](https://github.com/redkubes/otomi-api/commit/e229101a9b8cba418d4f3444b887942fbe36f480))

### [0.4.74](https://github.com/redkubes/otomi-api/compare/v0.4.73...v0.4.74) (2021-10-09)


### Features

* drone home alerts, fixed schema [ci skip] ([0ccf644](https://github.com/redkubes/otomi-api/commit/0ccf6444ca68f5d0b775e000b72e7be8df7159a5))


### Code Refactoring

* moved customer to cluster.owner ([#216](https://github.com/redkubes/otomi-api/issues/216)) ([2a7fe7a](https://github.com/redkubes/otomi-api/commit/2a7fe7a64eb7876de482976b569df03859bac304))

### [0.4.73](https://github.com/redkubes/otomi-api/compare/v0.4.71...v0.4.73) (2021-10-06)


### Features

* **schema:** 🎸 added new x-default field to not force strings in forms ([#213](https://github.com/redkubes/otomi-api/issues/213)) ([76197bc](https://github.com/redkubes/otomi-api/commit/76197bc684073880dd5bfec29487893c15f335d3))


### Bug Fixes

* don't load missing files ([35b87ce](https://github.com/redkubes/otomi-api/commit/35b87ce4cf7f32baf99fa0725605da2526a243aa))
* encryption error upon missing dec file ([c51ee26](https://github.com/redkubes/otomi-api/commit/c51ee2696061c4095b95a2e146c0c301a2989e40))
* husky [ci skip] ([05b6521](https://github.com/redkubes/otomi-api/commit/05b6521cfb892edc22e1315b961298dc0d143caf))
* schema wording [ci skip] ([fc3466f](https://github.com/redkubes/otomi-api/commit/fc3466f0762c6231b5704e9d0b60d0e0be2ae43b))
* team data when no teams exist ([7b24f33](https://github.com/redkubes/otomi-api/commit/7b24f3368adc4400aa395d81eb23d3da306fa85c))


### Others

* **release:** 0.4.72 ([81a05cc](https://github.com/redkubes/otomi-api/commit/81a05cc1d7ed7e9dde63689fb8e2b971a22106ab))

### [0.4.72](https://github.com/redkubes/otomi-api/compare/v0.4.71...v0.4.72) (2021-09-28)


### Bug Fixes

* don't load missing files ([35b87ce](https://github.com/redkubes/otomi-api/commit/35b87ce4cf7f32baf99fa0725605da2526a243aa))
* encryption error upon missing dec file ([c51ee26](https://github.com/redkubes/otomi-api/commit/c51ee2696061c4095b95a2e146c0c301a2989e40))
* team data when no teams exist ([7b24f33](https://github.com/redkubes/otomi-api/commit/7b24f3368adc4400aa395d81eb23d3da306fa85c))

### [0.4.71](https://github.com/redkubes/otomi-api/compare/v0.4.70...v0.4.71) (2021-09-23)


### Bug Fixes

* kms validation ([#212](https://github.com/redkubes/otomi-api/issues/212)) ([c0c7637](https://github.com/redkubes/otomi-api/commit/c0c76376fe9ef005c4e8bd10c9918a1f3bdcdf6e))
* removed old schema settings and added globalPullSecret (fixes [#210](https://github.com/redkubes/otomi-api/issues/210)) ([#211](https://github.com/redkubes/otomi-api/issues/211)) ([0bcd93d](https://github.com/redkubes/otomi-api/commit/0bcd93daccd2854d7c46a4c59ed9c37a5ed4a2d6))
* test ([4ca50b3](https://github.com/redkubes/otomi-api/commit/4ca50b3ff29dae4b662588b85ac71921fb71c6b4))

### [0.4.70](https://github.com/redkubes/otomi-api/compare/v0.4.68...v0.4.70) (2021-09-02)


### Bug Fixes

* await encrypt ([babd448](https://github.com/redkubes/otomi-api/commit/babd448a01af133b0a50796a5d0823cb2521e817))
* docker ignore vendor ([a2718d9](https://github.com/redkubes/otomi-api/commit/a2718d9f740979fa151d319d526f61da1cfbb077))
* dry schema, sec context for ksvc ([b9b4f9d](https://github.com/redkubes/otomi-api/commit/b9b4f9d02bca3d700676c6e1c5b39350bde29e0e))
* job spec ([c632624](https://github.com/redkubes/otomi-api/commit/c632624eb90da95eda5fb22a313e2048fc959d21))
* pruning empty objects, strings and nulls ([#209](https://github.com/redkubes/otomi-api/issues/209)) ([ab3b4cf](https://github.com/redkubes/otomi-api/commit/ab3b4cf6034a303361c87022dbd2f88590696f73))
* values valiation error ([8e99fd3](https://github.com/redkubes/otomi-api/commit/8e99fd394cec529bde41f3d54397fe72e05cbbe1))


### Others

* **release:** 0.4.69 ([0ff594e](https://github.com/redkubes/otomi-api/commit/0ff594ec1b9b802333cfb6160749dff0ca1b79d8))

### [0.4.69](https://github.com/redkubes/otomi-api/compare/v0.4.68...v0.4.69) (2021-08-30)


### Bug Fixes

* await encrypt ([babd448](https://github.com/redkubes/otomi-api/commit/babd448a01af133b0a50796a5d0823cb2521e817))
* docker ignore vendor ([a2718d9](https://github.com/redkubes/otomi-api/commit/a2718d9f740979fa151d319d526f61da1cfbb077))

### [0.4.68](https://github.com/redkubes/otomi-api/compare/v0.4.67...v0.4.68) (2021-08-28)


### Bug Fixes

* mkdir for teams ([7f097a2](https://github.com/redkubes/otomi-api/commit/7f097a217c9efdfc9c295c104f410409b9931a01))

### [0.4.67](https://github.com/redkubes/otomi-api/compare/v0.4.66...v0.4.67) (2021-08-27)


### Features

* use new alpine image ([#196](https://github.com/redkubes/otomi-api/issues/196)) ([149b6f9](https://github.com/redkubes/otomi-api/commit/149b6f9d2b665a9018e6e660c6832829a5e3df7a))


### Bug Fixes

* app.js does not exist in /app/dist/src/app.js  ([#190](https://github.com/redkubes/otomi-api/issues/190)) ([3abfc8c](https://github.com/redkubes/otomi-api/commit/3abfc8cc70316e8ac0df478a6fedc62f8b3457a9))
* copy generated-schema.json to right location ([#198](https://github.com/redkubes/otomi-api/issues/198)) ([6b22d3e](https://github.com/redkubes/otomi-api/commit/6b22d3e0208190b3e467a075dbffc3a87d91e82b))
* do not remove attributes ([#192](https://github.com/redkubes/otomi-api/issues/192)) ([b59f0d7](https://github.com/redkubes/otomi-api/commit/b59f0d718ad937b7ecf83da1e45333fee11eb047))
* fetch before checking out branch in local git  repo ([#204](https://github.com/redkubes/otomi-api/issues/204)) ([63f5dd8](https://github.com/redkubes/otomi-api/commit/63f5dd883c63a9394a071dbf6ee4a193292ef305))
* jobs in otomi cnsole do not work ([#194](https://github.com/redkubes/otomi-api/issues/194)) ([cb3aea2](https://github.com/redkubes/otomi-api/commit/cb3aea2a1906bf6a36f25c0b93c954211b563f2e))
* podspec, docker-compose ([#206](https://github.com/redkubes/otomi-api/issues/206)) ([ada1609](https://github.com/redkubes/otomi-api/commit/ada16095e1e744138064f57ba736216dddc4d559))
* return additional clusters as empty array, fixes [#92](https://github.com/redkubes/otomi-api/issues/92) ([#205](https://github.com/redkubes/otomi-api/issues/205)) ([8f1af8c](https://github.com/redkubes/otomi-api/commit/8f1af8cca9d09ffc64fc01311741ff4ab2476ef3))


### Others

* add issue templates ([#193](https://github.com/redkubes/otomi-api/issues/193)) ([0cf993e](https://github.com/redkubes/otomi-api/commit/0cf993eb20d073f06e97b6df56b0891ef0826943))

### [0.4.69](https://github.com/redkubes/otomi-api/compare/v0.4.65...v0.4.69) (2021-07-15)


### Others

* **release:** 0.4.69 ([a1aa9cb](https://github.com/redkubes/otomi-api/commit/a1aa9cb4949e15678e972caece0ee29e71f46dff))

### [0.4.66](https://github.com/redkubes/otomi-api/compare/v0.4.65...v0.4.66) (2021-07-15)


### Features

* add cluster.yaml to api ([#186](https://github.com/redkubes/otomi-api/issues/186)) ([4da09e0](https://github.com/redkubes/otomi-api/commit/4da09e09b41a8dbc7a69a8f0841b00bf1da41f22))


### Bug Fixes

* build ([#189](https://github.com/redkubes/otomi-api/issues/189)) ([2e9378c](https://github.com/redkubes/otomi-api/commit/2e9378c94e84599ffb45b375b4f1c71b75f9573c))
* kube config generation ([#188](https://github.com/redkubes/otomi-api/issues/188)) ([8f01048](https://github.com/redkubes/otomi-api/commit/8f01048486e75f881f3b475fbe97c5edf0850b1c))

### [0.4.65](https://github.com/redkubes/otomi-api/compare/v0.4.64...v0.4.65) (2021-07-05)


### Bug Fixes

* api server url ([#187](https://github.com/redkubes/otomi-api/issues/187)) ([a898028](https://github.com/redkubes/otomi-api/commit/a8980286f91ff6254273c7e6872915547a42e4f8))

### [0.4.64](https://github.com/redkubes/otomi-api/compare/v0.4.63...v0.4.64) (2021-07-04)


### Bug Fixes

* schema descriptions [ci skip] ([a4d5b99](https://github.com/redkubes/otomi-api/commit/a4d5b994f98c0b88e7058c00045c82e2b44bdf0c))

### [0.4.63](https://github.com/redkubes/otomi-api/compare/v0.4.62...v0.4.63) (2021-07-03)


### Bug Fixes

* api server schema validation ([89ec575](https://github.com/redkubes/otomi-api/commit/89ec575211393dae90b82a1733c994875003cbca))
* removed duplicate decrypt call ([2a00312](https://github.com/redkubes/otomi-api/commit/2a00312112e43086b2da339bec7d304f32fadf9f))
* removed duplicate encrypt call ([d87ce66](https://github.com/redkubes/otomi-api/commit/d87ce66fdcb0bbef3ee8aabfcd29ee041d1af75c))
* schema additions [ci skip] ([a69dcb1](https://github.com/redkubes/otomi-api/commit/a69dcb1c4950a2ded69db09360d333c2b2f0dd72))


### Others

* **release:** 0.4.62 ([16f3055](https://github.com/redkubes/otomi-api/commit/16f305590aaa482a7e496853bf261164bfad49ba))

### [0.4.62](https://github.com/redkubes/otomi-api/compare/v0.4.61...v0.4.62) (2021-06-29)


### Bug Fixes

* schema, yaml indent [ci skip] ([8708d63](https://github.com/redkubes/otomi-api/commit/8708d63314bec0628d96f1bf48b42de213be7adf))

### [0.4.61](https://github.com/redkubes/otomi-api/compare/v0.4.60...v0.4.61) (2021-06-29)


### Features

* ksvc containerPort, resourceQuota [ci skip] ([a7c8487](https://github.com/redkubes/otomi-api/commit/a7c8487cab053cdfabc3f371f311fa5fbae18b9f))

### [0.4.60](https://github.com/redkubes/otomi-api/compare/v0.4.59...v0.4.60) (2021-06-24)


### Features

* manage policies in api ([#184](https://github.com/redkubes/otomi-api/issues/184)) ([2e0e040](https://github.com/redkubes/otomi-api/commit/2e0e040512f870eb3921bf112b3c0a320b671618))


### Bug Fixes

* kubecfg needed cluster input, fixes [#180](https://github.com/redkubes/otomi-api/issues/180) ([eac55fb](https://github.com/redkubes/otomi-api/commit/eac55fb034001b344be7690a909b1b1d9fd670e4))

### [0.4.59](https://github.com/redkubes/otomi-api/compare/v0.4.58...v0.4.59) (2021-06-21)


### Features

* titles for otomi-console ([#179](https://github.com/redkubes/otomi-api/issues/179)) ([dda0d43](https://github.com/redkubes/otomi-api/commit/dda0d436cdf42ad0c3ae895bcdbf52c78aa5be44))


### Bug Fixes

* dirty settings ([a047e9e](https://github.com/redkubes/otomi-api/commit/a047e9e5acdf1a7f65b08c39e34d638178f17f32))
* schema ([d3b19f3](https://github.com/redkubes/otomi-api/commit/d3b19f3f8d955cb679e667a51aed622dadff741e))
* schema [ci skip] ([83c4616](https://github.com/redkubes/otomi-api/commit/83c4616ceec3bff89e117df9b2ac3ea41a79c199))

### [0.4.58](https://github.com/redkubes/otomi-api/compare/v0.4.57...v0.4.58) (2021-06-15)


### Others

* **release:** 0.4.57 ([3483288](https://github.com/redkubes/otomi-api/commit/34832883461b26623cd692edaf17f7a5faf0f3a5))
* **release:** 0.4.57 ([1841a25](https://github.com/redkubes/otomi-api/commit/1841a25764f1b2732def626495365b71a04edb75))

### [0.4.57](https://github.com/redkubes/otomi-api/compare/v0.4.56...v0.4.57) (2021-06-14)


### Bug Fixes

* schema [ci skip] ([b993da1](https://github.com/redkubes/otomi-api/commit/b993da113d770e659b67474a51171dc9b299eb62))

### [0.4.56](https://github.com/redkubes/otomi-api/compare/v0.4.55...v0.4.56) (2021-06-14)


### Bug Fixes

* removing post-commit as redundant [ci skip] ([3313966](https://github.com/redkubes/otomi-api/commit/33139665359a28081d1821b8bf56ea7109fe54f7))
* schema [ci skip] ([921d386](https://github.com/redkubes/otomi-api/commit/921d3862e6eee8f28533eb6afd3fcea2c6ae781a))


### Code Refactoring

* schema [ci skip] ([35d6146](https://github.com/redkubes/otomi-api/commit/35d61465987abebd034393133b316bf1e8d36df5))

### [0.4.55](https://github.com/redkubes/otomi-api/compare/v0.4.54...v0.4.55) (2021-06-14)


### Bug Fixes

* schema ([61be466](https://github.com/redkubes/otomi-api/commit/61be466c108572b5c02cfab199026135b4ab9c1d))
* schema [ci skip] ([917c7c7](https://github.com/redkubes/otomi-api/commit/917c7c7226cbd49eeb610aa68e0f8785e04a55cc))
* schema [ci skip] ([4e8273c](https://github.com/redkubes/otomi-api/commit/4e8273cb1ff200ca43b4b1fc2214053f0f6f8b15))

### [0.4.54](https://github.com/redkubes/otomi-api/compare/v0.4.53...v0.4.54) (2021-06-10)


### Features

* enhanced jobs config ([#177](https://github.com/redkubes/otomi-api/issues/177)) ([5a56992](https://github.com/redkubes/otomi-api/commit/5a569922104895442e54d5ea41c2f75d14233989))
* workaround ([#173](https://github.com/redkubes/otomi-api/issues/173)) ([69f0852](https://github.com/redkubes/otomi-api/commit/69f08521afb11a681e2ed2ddcec445a64dbadb80))


### Bug Fixes

* external secrets path prefix needed to avoid encryption ([d6a2d0f](https://github.com/redkubes/otomi-api/commit/d6a2d0f6f4a1873d91b28301ea36895ccf417728))
* now exiting on unhandled promise exception ([06d23a3](https://github.com/redkubes/otomi-api/commit/06d23a3ca50c79f37c1fe2bf2ec0e2c9bf8c4811))
* tests ([002a718](https://github.com/redkubes/otomi-api/commit/002a71880e13b5c43a4ac86c48ae8c361d246aa7))


### Code Refactoring

* cleaned up ([98f8493](https://github.com/redkubes/otomi-api/commit/98f8493e297ed270a20749831010f43f83f9af99))

### [0.4.53](https://github.com/redkubes/otomi-api/compare/v0.4.52...v0.4.53) (2021-05-24)


### Bug Fixes

* description [ci skip] ([319401e](https://github.com/redkubes/otomi-api/commit/319401e19e34910745c5e8e9787b038b4dfb77a4))
* missing files ([f7c62a2](https://github.com/redkubes/otomi-api/commit/f7c62a262c72cacdaf76ce888e637b5232020d53))
* secrets, dns dupe ([2059aa7](https://github.com/redkubes/otomi-api/commit/2059aa73f9f58d82603a5ea3d9d553c70ba14f8e))

### [0.4.52](https://github.com/redkubes/otomi-api/compare/v0.4.51...v0.4.52) (2021-05-24)


### Bug Fixes

* schema descriptions [ci skip] ([a48ef96](https://github.com/redkubes/otomi-api/commit/a48ef96fce9505c180435db3f43ef4e55a9d6b46))

### [0.4.51](https://github.com/redkubes/otomi-api/compare/v0.4.50...v0.4.51) (2021-05-22)


### Bug Fixes

* schema layout and decription [ci skip] ([096132d](https://github.com/redkubes/otomi-api/commit/096132dc484fb75e733b9b1167884ad4b5103c39))

### [0.4.50](https://github.com/redkubes/otomi-api/compare/v0.4.49...v0.4.50) (2021-05-22)


### Bug Fixes

* missing type object leads to hiding of title in rjsf ([5ec1453](https://github.com/redkubes/otomi-api/commit/5ec1453c1dbbec875417e987344c54c06b8a32ce))

### [0.4.49](https://github.com/redkubes/otomi-api/compare/v0.4.48...v0.4.49) (2021-05-22)

### Bug Fixes

- conditional ssl verify ([fe98bb2](https://github.com/redkubes/otomi-api/commit/fe98bb2cf372aee4765319d3e283fb526db51dfe))
- error handling ([3d28d18](https://github.com/redkubes/otomi-api/commit/3d28d1874e9be83ceb79b38bd18f880d9d9ff8a8))
- image tag pattern, middleware error handling ([3064231](https://github.com/redkubes/otomi-api/commit/3064231d457c7387e8c80b82996fa700fc80ac5c))
- missing ts-custom-error ([f8dc552](https://github.com/redkubes/otomi-api/commit/f8dc55268e5c6159e1c6d7cff4fe3b62cc96b8d7))
- ordering schema, tests, conflicts, url exists, errors ([64542b3](https://github.com/redkubes/otomi-api/commit/64542b33a0f06522a42332b67856bdc845cfc938))
- schema, tests ([193e356](https://github.com/redkubes/otomi-api/commit/193e356c220f0c07b913d403c91fced7c8fae79f))

### Code Refactoring

- error code for already exists ([0071c62](https://github.com/redkubes/otomi-api/commit/0071c626fdcb045ed38fd0f3463b8590828eaa60))
- error for not existing ([388d807](https://github.com/redkubes/otomi-api/commit/388d80790ddc7eba0a8498da7cad8b52f52561f8))

### Others

- remove charts property from test data ([#161](https://github.com/redkubes/otomi-api/issues/161)) ([72ce45b](https://github.com/redkubes/otomi-api/commit/72ce45b9f03eafccceead6ac133a58a0c298cebd))
- **release:** 0.4.48 ([b1c4abd](https://github.com/redkubes/otomi-api/commit/b1c4abd30d8eabe7a34639749ac34698b79f2010))

### [0.4.48](https://github.com/redkubes/otomi-api/compare/v0.4.47...v0.4.48) (2021-05-04)

### Features

- add option ([#157](https://github.com/redkubes/otomi-api/issues/157)) ([035a74c](https://github.com/redkubes/otomi-api/commit/035a74c03cc02daa90f6d3d5dd60a4c9424033a2))
- Expose settings in api ([#152](https://github.com/redkubes/otomi-api/issues/152)) ([85d3695](https://github.com/redkubes/otomi-api/commit/85d369586183716b21d4f7e8f632f67458d51560))

### Bug Fixes

- build before lint ([f42ab5e](https://github.com/redkubes/otomi-api/commit/f42ab5e31e78b4551a246027f1daa5975f1e3859))
- build would not resolve inline-schema (only $ref) ([#158](https://github.com/redkubes/otomi-api/issues/158)) ([9893a56](https://github.com/redkubes/otomi-api/commit/9893a5652c4bddced9033c82ecbd362978c35337))
- input pattern for ksvc image tag ([b40843c](https://github.com/redkubes/otomi-api/commit/b40843cbaa9c0a23b7f71d2987393c2b014d84b5))
- missing apidevtools ([8c77407](https://github.com/redkubes/otomi-api/commit/8c7740795c11a329142a03021dc02b259bc17ec3))
- missing schema file now copied ([ebf96cd](https://github.com/redkubes/otomi-api/commit/ebf96cdd19a4e3cfe204b6b6ee18c91cf55902cc))
- postinstall for models ([8cfd418](https://github.com/redkubes/otomi-api/commit/8cfd4187cc59b6a8ddf52eebbc32ce72cf34cacb))
- repo pull not needed for fresh repo ([f50309e](https://github.com/redkubes/otomi-api/commit/f50309e12a3179c6996ed8ecd9a9dfac127399a3))
- test core.yaml [ci skip] ([dc26606](https://github.com/redkubes/otomi-api/commit/dc266060f44ee3bd6ede7883c62499ea7abbb7f3))

### Build System

- **deps:** bump y18n from 4.0.0 to 4.0.1 ([#153](https://github.com/redkubes/otomi-api/issues/153)) ([4c29fee](https://github.com/redkubes/otomi-api/commit/4c29fee695866add2e6769a12158ce64ef54fe67))

### Docs

- added info on npm link ([1dfb88d](https://github.com/redkubes/otomi-api/commit/1dfb88d350e3dd3e3bb0dd90633d48b500f40558))

### [0.4.47](https://github.com/redkubes/otomi-api/compare/v0.4.46...v0.4.47) (2021-03-18)

### Bug Fixes

- port location [ci skip](<[8c77385](https://github.com/redkubes/otomi-api/commit/8c77385e3694604e49f330fedd6f0424a9727974)>)

### [0.4.46](https://github.com/redkubes/otomi-api/compare/v0.4.45...v0.4.46) (2021-03-18)

### Bug Fixes

- client release versioning [ci skip](<[bf60bda](https://github.com/redkubes/otomi-api/commit/bf60bdafadf1f4b62d4267c3a4daf781ed654cca)>)
- set version in api spec to PLACEHOLDER to avoid confusion [ci skip](<[d8a4b3f](https://github.com/redkubes/otomi-api/commit/d8a4b3f365ea1c250e188b67865d8fdc5066f997)>)

### Others

- **release:** 0.4.45 ([eee4fcc](https://github.com/redkubes/otomi-api/commit/eee4fcc6c940fe0b86c9356218fef1a4eb6e7f8f))

### [0.4.44](https://github.com/redkubes/otomi-api/compare/v0.4.43...v0.4.44) (2021-03-18)

### Features

- a user can define external secrets in otomi-api ([#141](https://github.com/redkubes/otomi-api/issues/141)) ([29fe339](https://github.com/redkubes/otomi-api/commit/29fe33940502502ba290297e5ce55be51c416999))

### Bug Fixes

- release step ([406c536](https://github.com/redkubes/otomi-api/commit/406c5368e53344760ec2aa5d6952a35f0e63cd05))
- unterminated substitute pattern error from sed ([#147](https://github.com/redkubes/otomi-api/issues/147)) ([852108c](https://github.com/redkubes/otomi-api/commit/852108c86a614d5cb5109a23f2545dc01c53354e))

### Build System

- npm run release publishes npm client ([#136](https://github.com/redkubes/otomi-api/issues/136)) ([c365102](https://github.com/redkubes/otomi-api/commit/c365102308f606e5d863dc1fc86d7ff703e9c855))

### [0.4.43](https://github.com/redkubes/otomi-api/compare/v0.4.42...v0.4.43) (2021-03-04)

### Features

- added npm publish to github workflow ([506908c](https://github.com/redkubes/otomi-api/commit/506908cef35d656d3fc364954a24265ce314ffdf))

### Bug Fixes

- allow missing team service files ([#132](https://github.com/redkubes/otomi-api/issues/132)) ([efa2c86](https://github.com/redkubes/otomi-api/commit/efa2c86074fadd85564fa850037081ecf810c896))
- missing file for release step [ci skip](<[4bc456a](https://github.com/redkubes/otomi-api/commit/4bc456adf8f3815c36247a62a80e69e5ce11ef8f)>)
- npmrc plus docs ([#129](https://github.com/redkubes/otomi-api/issues/129)) ([88f881a](https://github.com/redkubes/otomi-api/commit/88f881ab388895fa95845dfff24730e59cdc8d93))
- try catching team secrets because those might not exist ([e4faee6](https://github.com/redkubes/otomi-api/commit/e4faee637a7b9ce32e740fe02c92dc12e40d75b0))
- vulnerabilities ([ebf4a94](https://github.com/redkubes/otomi-api/commit/ebf4a9460dc78beac03582d38929174c0dd26997))

### [0.4.42](https://github.com/redkubes/otomi-api/compare/v0.4.41...v0.4.42) (2020-12-06)

### Bug Fixes

- docurl [ci skip](<[fbccd70](https://github.com/redkubes/otomi-api/commit/fbccd70b2cb47f75e14a144650c6745567a01812)>)

### [0.4.41](https://github.com/redkubes/otomi-api/compare/v0.4.40...v0.4.41) (2020-12-04)

### Bug Fixes

- docurl [ci skip](<[d746025](https://github.com/redkubes/otomi-api/commit/d7460254d61d72571dc12c2a8d3e46687cd6e2a6)>)

### Docs

- updated version in schema [ci skip](<[5a33dc4](https://github.com/redkubes/otomi-api/commit/5a33dc4ed3f1cd4cc260f90a0d13614aa4120dc4)>)

### [0.4.40](https://github.com/redkubes/otomi-api/compare/v0.4.39...v0.4.40) (2020-11-29)

### Features

- multiple alert endpoints ([04cd606](https://github.com/redkubes/otomi-api/commit/04cd6066d906b4cec377c35119619b51f684fa3a))

### Bug Fixes

- alerts added to test ([808ee8d](https://github.com/redkubes/otomi-api/commit/808ee8de5a83b12846c98ca532089a54f7f7689c))
- test related to azure monitor ([7a91a0c](https://github.com/redkubes/otomi-api/commit/7a91a0c88525c086d39ae5480e7e9647faa5c24c))

### Code Refactoring

- monitor to azureMonitor ([31bdcfe](https://github.com/redkubes/otomi-api/commit/31bdcfeb1f3ad48a385850454d0b0ecf128ea2ba))

### [0.4.39](https://github.com/redkubes/otomi-api/compare/v0.4.37...v0.4.39) (2020-11-20)

### Features

- **no_authz:** allowing to start without authz checks, defaulting to admin ([cb33da6](https://github.com/redkubes/otomi-api/commit/cb33da68d2a86807164e8780ec4038f44772bd8a))
- use_sops flag ([#125](https://github.com/redkubes/otomi-api/issues/125)) ([37f5382](https://github.com/redkubes/otomi-api/commit/37f5382736168548f57f7dd2fc0f273536f2f5d4))

### Bug Fixes

- ci docker secret ([4e71bf5](https://github.com/redkubes/otomi-api/commit/4e71bf5fccd6d2f2e0241614cf1fe97ffebdabfa))

### CI

- release step added [ci skip](<[476fb60](https://github.com/redkubes/otomi-api/commit/476fb604a41de2fa06b53cc845f8dc46dc14001d)>)

### Tests

- **lint:** added js checking [ci skip](<[c9af447](https://github.com/redkubes/otomi-api/commit/c9af447b6e7e7634a2f77150e043265cb9a8dacc)>)

### Others

- **release:** 0.4.38 ([c4ddb1b](https://github.com/redkubes/otomi-api/commit/c4ddb1bc1cbb6459f166c3d947625d44b632728f))
- cleanup [ci skip](<[c42fc3b](https://github.com/redkubes/otomi-api/commit/c42fc3b024347994c691457cdbb95e17cb24a6b6)>)
- **coding-standards:** fixed eslint autofix, prettier autosave [ci skip](<[cc0e225](https://github.com/redkubes/otomi-api/commit/cc0e225585958c3f6bbd8de2c7f719e415b8b7b9)>)

### [0.4.38](https://github.com/redkubes/otomi-api/compare/v0.4.37...v0.4.38) (2020-11-20)

### Features

- **no_authz:** allowing to start without authz checks, defaulting to admin ([cb33da6](https://github.com/redkubes/otomi-api/commit/cb33da68d2a86807164e8780ec4038f44772bd8a))
- use_sops flag ([#125](https://github.com/redkubes/otomi-api/issues/125)) ([37f5382](https://github.com/redkubes/otomi-api/commit/37f5382736168548f57f7dd2fc0f273536f2f5d4))

### CI

- release step added [ci skip](<[476fb60](https://github.com/redkubes/otomi-api/commit/476fb604a41de2fa06b53cc845f8dc46dc14001d)>)

### Tests

- **lint:** added js checking [ci skip](<[c9af447](https://github.com/redkubes/otomi-api/commit/c9af447b6e7e7634a2f77150e043265cb9a8dacc)>)

### Others

- cleanup [ci skip](<[c42fc3b](https://github.com/redkubes/otomi-api/commit/c42fc3b024347994c691457cdbb95e17cb24a6b6)>)
- **coding-standards:** fixed eslint autofix, prettier autosave [ci skip](<[cc0e225](https://github.com/redkubes/otomi-api/commit/cc0e225585958c3f6bbd8de2c7f719e415b8b7b9)>)

### [0.4.37](https://github.com/redkubes/otomi-api/compare/v0.4.36...v0.4.37) (2020-10-30)

### Features

- otomi version in cluster output [ci skip](<[393a2e7](https://github.com/redkubes/otomi-api/commit/393a2e76fc4d381f09d46e63dedfbb3c8f0379d6)>)

### [0.4.36](https://github.com/redkubes/otomi-api/compare/v0.4.35...v0.4.36) (2020-10-30)

### Bug Fixes

- enabled missing from spec [ci skip](<[ece4800](https://github.com/redkubes/otomi-api/commit/ece4800fc332d06169ba213ea01acc0d396d232e)>)

### [0.4.35](https://github.com/redkubes/otomi-api/compare/v0.4.34...v0.4.35) (2020-10-30)

### Features

- filtering out resources for disabled clusters ([0ee4330](https://github.com/redkubes/otomi-api/commit/0ee4330fc2d7506cd3319111e5790cee40305a3d))

### Bug Fixes

- tests, missing file [ci skip](<[201c444](https://github.com/redkubes/otomi-api/commit/201c444dca5fb629187e9072ea4536987766ec03)>)
- **spec:** authorization header ([65f4b25](https://github.com/redkubes/otomi-api/commit/65f4b2576821bed0d41a61ed113b84b51aa91e46))
- git rebase abort flag ([eec53ec](https://github.com/redkubes/otomi-api/commit/eec53eca057f1d36d6068069d680b05991a1d8f1))
- process exit after 1 sec on save error ([189e4d2](https://github.com/redkubes/otomi-api/commit/189e4d21c7ae29e69a2b659d94dce5b03bfc8020))
- process exit after 1 sec on save error ([2d08404](https://github.com/redkubes/otomi-api/commit/2d08404c954937645939afd3311d146e653a4929))
- removed keycloak and harbor client ([fadbe8a](https://github.com/redkubes/otomi-api/commit/fadbe8a89aa5a85e663ba17e00c96d17b1dbe7fe))
- token quotes? ([4453d84](https://github.com/redkubes/otomi-api/commit/4453d84d13bb37c96c5dd88bc9dd272c0290021f))
- workflow ([481b595](https://github.com/redkubes/otomi-api/commit/481b5954294f0c8b0b2680feb9d04d58a11db3fb))
- workflow ([0d1d61f](https://github.com/redkubes/otomi-api/commit/0d1d61f9680293fb226e27fbf67ad20830057a5e))
- workflow ([6438b85](https://github.com/redkubes/otomi-api/commit/6438b85e46ab17e38837e3a27910bd120973dfe0))
- workflow ([80129c6](https://github.com/redkubes/otomi-api/commit/80129c634ec9243657994e3c52a5411f2d0bdc5f))
- workflow ([f1aafef](https://github.com/redkubes/otomi-api/commit/f1aafef952b3682ad9f864e04d3d8419540297aa))

### Code Refactoring

- now using ghcr.io as private cache ([9df44f7](https://github.com/redkubes/otomi-api/commit/9df44f733ef80ea7cf31ec4701ea36a01db44fce))
- removed tasks, fixed npmrc ([05041cc](https://github.com/redkubes/otomi-api/commit/05041cc0a8dc3f40e9097b5152dc7dd9f5705e2e))
- renamed repos and images ([db09fb9](https://github.com/redkubes/otomi-api/commit/db09fb9f69ad2ea4074ec95da0b79b68344b78fd))

### Others

- **release:** 0.4.34 ([b3c5994](https://github.com/redkubes/otomi-api/commit/b3c599412cfb8e53c3f0686402a2390773fca7c2))
- **release:** 0.4.35 ([4660fc9](https://github.com/redkubes/otomi-api/commit/4660fc9c6e1ea6ac14c9e3ee1eccaaa170ad4542))

### [0.4.36](https://github.com/redkubes/otomi-api/compare/v0.4.34...v0.4.36) (2020-10-30)

### Features

- filtering out resources for disabled clusters ([0ee4330](https://github.com/redkubes/otomi-api/commit/0ee4330fc2d7506cd3319111e5790cee40305a3d))

### Bug Fixes

- tests, missing file [ci skip](<[201c444](https://github.com/redkubes/otomi-api/commit/201c444dca5fb629187e9072ea4536987766ec03)>)
- **spec:** authorization header ([65f4b25](https://github.com/redkubes/otomi-api/commit/65f4b2576821bed0d41a61ed113b84b51aa91e46))
- git rebase abort flag ([eec53ec](https://github.com/redkubes/otomi-api/commit/eec53eca057f1d36d6068069d680b05991a1d8f1))
- process exit after 1 sec on save error ([189e4d2](https://github.com/redkubes/otomi-api/commit/189e4d21c7ae29e69a2b659d94dce5b03bfc8020))
- process exit after 1 sec on save error ([2d08404](https://github.com/redkubes/otomi-api/commit/2d08404c954937645939afd3311d146e653a4929))
- removed keycloak and harbor client ([fadbe8a](https://github.com/redkubes/otomi-api/commit/fadbe8a89aa5a85e663ba17e00c96d17b1dbe7fe))
- token quotes? ([4453d84](https://github.com/redkubes/otomi-api/commit/4453d84d13bb37c96c5dd88bc9dd272c0290021f))
- workflow ([481b595](https://github.com/redkubes/otomi-api/commit/481b5954294f0c8b0b2680feb9d04d58a11db3fb))
- workflow ([0d1d61f](https://github.com/redkubes/otomi-api/commit/0d1d61f9680293fb226e27fbf67ad20830057a5e))
- workflow ([6438b85](https://github.com/redkubes/otomi-api/commit/6438b85e46ab17e38837e3a27910bd120973dfe0))
- workflow ([80129c6](https://github.com/redkubes/otomi-api/commit/80129c634ec9243657994e3c52a5411f2d0bdc5f))
- workflow ([f1aafef](https://github.com/redkubes/otomi-api/commit/f1aafef952b3682ad9f864e04d3d8419540297aa))

### Code Refactoring

- now using ghcr.io as private cache ([9df44f7](https://github.com/redkubes/otomi-api/commit/9df44f733ef80ea7cf31ec4701ea36a01db44fce))
- removed tasks, fixed npmrc ([05041cc](https://github.com/redkubes/otomi-api/commit/05041cc0a8dc3f40e9097b5152dc7dd9f5705e2e))
- renamed repos and images ([db09fb9](https://github.com/redkubes/otomi-api/commit/db09fb9f69ad2ea4074ec95da0b79b68344b78fd))

### Others

- **release:** 0.4.34 ([b3c5994](https://github.com/redkubes/otomi-api/commit/b3c599412cfb8e53c3f0686402a2390773fca7c2))
- **release:** 0.4.35 ([4660fc9](https://github.com/redkubes/otomi-api/commit/4660fc9c6e1ea6ac14c9e3ee1eccaaa170ad4542))

### [0.4.35](https://github.com/redkubes/otomi-api/compare/v0.4.34...v0.4.35) (2020-10-30)

### Features

- filtering out resources for disabled clusters ([0ee4330](https://github.com/redkubes/otomi-api/commit/0ee4330fc2d7506cd3319111e5790cee40305a3d))

### Bug Fixes

- **spec:** authorization header ([65f4b25](https://github.com/redkubes/otomi-api/commit/65f4b2576821bed0d41a61ed113b84b51aa91e46))
- git rebase abort flag ([eec53ec](https://github.com/redkubes/otomi-api/commit/eec53eca057f1d36d6068069d680b05991a1d8f1))
- process exit after 1 sec on save error ([189e4d2](https://github.com/redkubes/otomi-api/commit/189e4d21c7ae29e69a2b659d94dce5b03bfc8020))
- process exit after 1 sec on save error ([2d08404](https://github.com/redkubes/otomi-api/commit/2d08404c954937645939afd3311d146e653a4929))
- removed keycloak and harbor client ([fadbe8a](https://github.com/redkubes/otomi-api/commit/fadbe8a89aa5a85e663ba17e00c96d17b1dbe7fe))
- token quotes? ([4453d84](https://github.com/redkubes/otomi-api/commit/4453d84d13bb37c96c5dd88bc9dd272c0290021f))
- workflow ([481b595](https://github.com/redkubes/otomi-api/commit/481b5954294f0c8b0b2680feb9d04d58a11db3fb))
- workflow ([0d1d61f](https://github.com/redkubes/otomi-api/commit/0d1d61f9680293fb226e27fbf67ad20830057a5e))
- workflow ([6438b85](https://github.com/redkubes/otomi-api/commit/6438b85e46ab17e38837e3a27910bd120973dfe0))
- workflow ([80129c6](https://github.com/redkubes/otomi-api/commit/80129c634ec9243657994e3c52a5411f2d0bdc5f))
- workflow ([f1aafef](https://github.com/redkubes/otomi-api/commit/f1aafef952b3682ad9f864e04d3d8419540297aa))

### Others

- **release:** 0.4.34 ([b3c5994](https://github.com/redkubes/otomi-api/commit/b3c599412cfb8e53c3f0686402a2390773fca7c2))

### Code Refactoring

- now using ghcr.io as private cache ([9df44f7](https://github.com/redkubes/otomi-api/commit/9df44f733ef80ea7cf31ec4701ea36a01db44fce))
- removed tasks, fixed npmrc ([05041cc](https://github.com/redkubes/otomi-api/commit/05041cc0a8dc3f40e9097b5152dc7dd9f5705e2e))
- renamed repos and images ([db09fb9](https://github.com/redkubes/otomi-api/commit/db09fb9f69ad2ea4074ec95da0b79b68344b78fd))

### [0.4.34](https://github.com/redkubes/otomi-api/compare/v0.4.33...v0.4.34) (2020-10-26)

### Feature Improvements

- added versions to session ([b1ea4bc](https://github.com/redkubes/otomi-api/commit/b1ea4bc8dd22aedb993cd530b103ab680b949cb1))

### [0.4.33](https://github.com/redkubes/otomi-api/compare/v0.4.32...v0.4.33) (2020-10-25)

### Bug Fixes

- adding owners file [ci skip](<[bd4256a](https://github.com/redkubes/otomi-api/commit/bd4256a4a8866031244038be2ebb55e29caf6576)>)
- regression ([165c2bc](https://github.com/redkubes/otomi-api/commit/165c2bca56dbdaf79cec0acb9af3d76a33657f77))
- regression ([5114170](https://github.com/redkubes/otomi-api/commit/5114170655e64fa733b1cd051c7f60f2629e9bce))
- regression missing git in image ([77a8b13](https://github.com/redkubes/otomi-api/commit/77a8b13cc08ceabec50aaf92be2042bf4c723ec5))
- regression missing git in image ([ec60ab5](https://github.com/redkubes/otomi-api/commit/ec60ab55eb4edb5e436ba959c14aa0468e95e853))
- regression missing git in image ([9adb07d](https://github.com/redkubes/otomi-api/commit/9adb07d6cde2a150ef200b8757794731bc089f60))
- **repo:** removed checkout in case repo exists as OS can differ ([2d754d2](https://github.com/redkubes/otomi-api/commit/2d754d2084060fe3dc4d35755cec30788590cf99))

### Code Refactoring

- cleaned output [ci skip](<[130e228](https://github.com/redkubes/otomi-api/commit/130e228b125db1f01ddfc5a71b1d536dd1e6f450)>)

### CI

- workflow fix [ci skip](<[912f358](https://github.com/redkubes/otomi-api/commit/912f358ead23a5f25cccbb1bcbb01881898fd39e)>)

### [0.4.32](https://github.com/redkubes/otomi-api/compare/v0.4.31...v0.4.32) (2020-09-30)

### Bug Fixes

- do not apply cluster dns zone ([#124](https://github.com/redkubes/otomi-api/issues/124)) ([dcb852b](https://github.com/redkubes/otomi-api/commit/dcb852b3010351522699dbd8eb58d0b654d0a077))

### [0.4.31](https://github.com/redkubes/otomi-api/compare/v0.4.30...v0.4.31) (2020-09-28)

### [0.4.30](https://github.com/redkubes/otomi-api/compare/v0.4.29...v0.4.30) (2020-09-01)

### Bug Fixes

- oidc settings, duplicate teams [ci skip](<[0497270](https://github.com/redkubes/otomi-api/commit/0497270e12d55b4521260836d97d0f494562b766)>)

### [0.4.28](https://github.com/redkubes/otomi-api/compare/v0.4.27...v0.4.28) (2020-08-25)

### Bug Fixes

- moved ingress part below svc input [ci skip](<[52166f5](https://github.com/redkubes/otomi-api/commit/52166f5c9b97c95b2071e6cfb895b521cb385a38)>)

### [0.4.27](https://github.com/redkubes/otomi-api/compare/v0.4.26...v0.4.27) (2020-08-24)

### Bug Fixes

- team-admin group for harbor project [ci skip](<[208a087](https://github.com/redkubes/otomi-api/commit/208a0875268f7a2da75f753a1c55ac0b8b8a570a)>)

### [0.4.26](https://github.com/redkubes/otomi-api/compare/v0.4.25...v0.4.26) (2020-08-24)

### Bug Fixes

- hardcoded group 'admin' to harbor admin [ci skip](<[f45575a](https://github.com/redkubes/otomi-api/commit/f45575aebf0ea777b042f1749cdaf8b5da21e375)>)

### [0.4.25](https://github.com/redkubes/otomi-api/compare/v0.4.24...v0.4.25) (2020-08-24)

### Bug Fixes

- create keycloak static admin teams ([#113](https://github.com/redkubes/otomi-api/issues/113)) ([1b76cb5](https://github.com/redkubes/otomi-api/commit/1b76cb511bdd9bcc743b0c24f098cbbd75a6c1f2))

### [0.4.24](https://github.com/redkubes/otomi-api/compare/v0.4.23...v0.4.24) (2020-08-23)

### Bug Fixes

- idempotency harbor, team-admin mapper added [ci skip](<[304ff72](https://github.com/redkubes/otomi-api/commit/304ff724be5734845373df8c94087ee34a444c7f)>)

### [0.4.23](https://github.com/redkubes/otomi-api/compare/v0.4.22...v0.4.23) (2020-08-23)

### Code Refactoring

- task idempotency, cleanup [ci skip](<[3b0b929](https://github.com/redkubes/otomi-api/commit/3b0b929b9c3afd8d4c7e3e267ee9afae07dca1cc)>)

### [0.4.22](https://github.com/redkubes/otomi-api/compare/v0.4.19...v0.4.22) (2020-08-23)

### Others

- **release:** 0.10.92 ([c12892f](https://github.com/redkubes/otomi-api/commit/c12892fc78bd82cbe6f6f3b01917724216c6a7da))
- **release:** 0.10.92 ([bc8c7fc](https://github.com/redkubes/otomi-api/commit/bc8c7fc87b7b418c99bcb44c9339c5fea104702d))
- **release:** 0.4.21 ([efca99e](https://github.com/redkubes/otomi-api/commit/efca99ec52e8c44cd8c33f015e82474c38482b04))

### [0.4.21](https://github.com/redkubes/otomi-api/compare/v0.4.19...v0.4.21) (2020-08-23)

### [0.4.20](https://github.com/redkubes/otomi-api/compare/v0.4.19...v0.4.20) (2020-08-23)

### Features

- **keycloak_tasks:** add keycloak task runners ([6aa60e5](https://github.com/redkubes/otomi-api/commit/6aa60e5509aae9928626b307b453aab607fd62f0))
- **launch.json:** add debugger configuration for tasks:keycloak ([489a9a1](https://github.com/redkubes/otomi-api/commit/489a9a125fb2fa5177999daccb6f3e6cf9eb2457))

### Bug Fixes

- **src/tasks/keycloak/config.ts:** add query to oidc discovery urls ([2df9058](https://github.com/redkubes/otomi-api/commit/2df90585fac49d6cd73994044423b7be131c68c0))
- merge master [ci skip](<[3050ddf](https://github.com/redkubes/otomi-api/commit/3050ddfb7890a666c9a8654ebe8412f614a37165)>)
- refactor [ci skip](<[7bce66d](https://github.com/redkubes/otomi-api/commit/7bce66d2774dea2c4f724f996d0b4331d409ca75)>)
- refactor config templates [ci skip](<[1c053f7](https://github.com/redkubes/otomi-api/commit/1c053f7f49dc48db753e10ab29d4c9f4cfc4097a)>)
- refactor syntax [ci skip](<[c32c64a](https://github.com/redkubes/otomi-api/commit/c32c64a6c3282a824225d1b066b743e2b243e3a5)>)
- **use cloud_tenant_id env var:** change env variable usage ([988f029](https://github.com/redkubes/otomi-api/commit/988f029f8083deedab1995700ab9ff28f8c180b4))

### Code Refactoring

- **env:** now using envalid ([e99d8b5](https://github.com/redkubes/otomi-api/commit/e99d8b558de85cf09681541da510d1941df87e77))
- refactor for multiple oidc providers ([cb2bc7e](https://github.com/redkubes/otomi-api/commit/cb2bc7efab119dfe0f6329838e5e627f5871de5e))
- **add roles, idp, client settings:** improving tasks ([13d9d04](https://github.com/redkubes/otomi-api/commit/13d9d04159b461f720eb3fa09baf68b6f22fb0a8))
- **code refactor:** remove hardcoded variables from config ([4f19c7a](https://github.com/redkubes/otomi-api/commit/4f19c7affa520b72067406eae454b2ed182316df))
- **interfaces.ts:** rename TeamMapping interface ([659acfb](https://github.com/redkubes/otomi-api/commit/659acfbd261894b5e8b63a5647d65c6c801a4853))
- **src/tasks/keycloak/keycloak.ts:** refactor for idempotent task ([f3a7896](https://github.com/redkubes/otomi-api/commit/f3a7896f30f239561af43946734e818097b9aeb5))
- remove wip tasks section [ci skip](<[0e59f34](https://github.com/redkubes/otomi-api/commit/0e59f343f08a1ccbf6ca7dce093f1960fd3ea318)>)
- **keycloak realm config factory:** refactor config and interfaces ([cd28b3e](https://github.com/redkubes/otomi-api/commit/cd28b3e80e56ac0d247f360d13fb270e77217bdf))

### [0.4.19](https://github.com/redkubes/otomi-api/compare/v0.4.18...v0.4.19) (2020-08-22)

### [0.4.18](https://github.com/redkubes/otomi-api/compare/v0.4.17...v0.4.18) (2020-08-18)

### Bug Fixes

- domain name creation [ci skip](<[ca96218](https://github.com/redkubes/otomi-api/commit/ca96218fa6bfdde0871167000bb130b8018fde0a)>)

### [0.4.17](https://github.com/redkubes/otomi-api/compare/v0.4.16...v0.4.17) (2020-08-18)

### Bug Fixes

- secrets population [ci skip](<[6bd610a](https://github.com/redkubes/otomi-api/commit/6bd610abd3b078b3e81aee9bad259466b9b9e81c)>)

### [0.4.16](https://github.com/redkubes/otomi-api/compare/v0.4.15...v0.4.16) (2020-08-18)

### Bug Fixes

- teams as comma sep string [ci skip](<[de12db8](https://github.com/redkubes/otomi-api/commit/de12db847d6e528086185cb428a18e5e15501299)>)
- teams as comma sep string [ci skip](<[3abe471](https://github.com/redkubes/otomi-api/commit/3abe47101ed7722033392118f93886b823658503)>)

### [0.4.15](https://github.com/redkubes/otomi-api/compare/v0.4.14...v0.4.15) (2020-08-18)

### Features

- add email of the author to commit message ([#104](https://github.com/redkubes/otomi-api/issues/104)) ([b3a9a36](https://github.com/redkubes/otomi-api/commit/b3a9a36349cabb8afeeb757b9391cc642f9671c5))
- save/load secrets ([#111](https://github.com/redkubes/otomi-api/issues/111)) ([a2d2e22](https://github.com/redkubes/otomi-api/commit/a2d2e22976c1850933f5c2e13a855c55802e28d2))

### Bug Fixes

- core [ci skip](<[41c490d](https://github.com/redkubes/otomi-api/commit/41c490ddaf792b296d4afefe234a293dbd38de6f)>)
- secrets acl + location [ci skip](<[cb7823b](https://github.com/redkubes/otomi-api/commit/cb7823b18f460e994af435af9ea4c244bc99d2a6)>)
- updated released apiDoc version [ci skip](<[fd67b0a](https://github.com/redkubes/otomi-api/commit/fd67b0a43ecfad16f7a20196a5e940ef2650efe9)>)

### Others

- core updated [ci skip](<[9075947](https://github.com/redkubes/otomi-api/commit/907594792b42d10d7a0edd165422c4fbbd8a7418)>)

### [0.4.14](https://github.com/redkubes/otomi-api/compare/v0.4.13...v0.4.14) (2020-08-07)

### Bug Fixes

- api spec [ci skip](<[2e9ef26](https://github.com/redkubes/otomi-api/commit/2e9ef26716af2507e55cb5b1b36cd33cca13ae2d)>)

### [0.4.13](https://github.com/redkubes/otomi-api/compare/v0.4.12...v0.4.13) (2020-08-06)

### Bug Fixes

- package missing [ci skip](<[da4bd6e](https://github.com/redkubes/otomi-api/commit/da4bd6ec478dda227b7cac0c745c72f39e2f51f6)>)

### [0.4.12](https://github.com/redkubes/otomi-api/compare/v0.4.11...v0.4.12) (2020-08-06)

### Bug Fixes

- disabled jwt validation [ci skip](<[cdaff55](https://github.com/redkubes/otomi-api/commit/cdaff55b25d854fc06f762ddf03de55a89b5de09)>)
- typing [ci skip](<[1ee6564](https://github.com/redkubes/otomi-api/commit/1ee656420e7e7f298b388b63194b66bfe6d0259f)>)

### [0.4.11](https://github.com/redkubes/otomi-api/compare/v0.4.10...v0.4.11) (2020-08-06)

### Bug Fixes

- jwt handler [ci skip](<[0038555](https://github.com/redkubes/otomi-api/commit/00385551f9ccedbeae4a42bd4312d11b522ec1a1)>)

### [0.4.10](https://github.com/redkubes/otomi-api/compare/v0.4.9...v0.4.10) (2020-08-06)

### Bug Fixes

- missing package [ci skip](<[8ec289b](https://github.com/redkubes/otomi-api/commit/8ec289bc3a8ecf99bb35c738fe5aa7232c3b13f8)>)

### [0.4.9](https://github.com/redkubes/otomi-api/compare/v0.4.8...v0.4.9) (2020-08-06)

### Features

- add group mapping ([#99](https://github.com/redkubes/otomi-api/issues/99)) ([5644277](https://github.com/redkubes/otomi-api/commit/56442772aa95423b326bea0b0610b2215d29d4a6))
- add service port ([#102](https://github.com/redkubes/otomi-api/issues/102)) ([b65603f](https://github.com/redkubes/otomi-api/commit/b65603fafcc80b787ec2eb0123c6afbb408757fb))

### Bug Fixes

- running docker-compose ([#96](https://github.com/redkubes/otomi-api/issues/96)) ([d18f90a](https://github.com/redkubes/otomi-api/commit/d18f90a66bf137aba980756babc295a6667238da))

### Others

- **release:** 0.4.8 ([5a47084](https://github.com/redkubes/otomi-api/commit/5a470844907da6aa97e7be9c85eace2e87371929))

### Feature Improvements

- jwt auth, added automation to generate otomi client ([#103](https://github.com/redkubes/otomi-api/issues/103)) ([93a2c6b](https://github.com/redkubes/otomi-api/commit/93a2c6bc6efde938cef7b138e622c597cf4f9179))

### [0.4.8](https://github.com/redkubes/otomi-api/compare/v0.4.7...v0.4.8) (2020-07-25)

### Bug Fixes

- svc.useDefaultSubdomain should remove domain [ci skip](<[1dd56a5](https://github.com/redkubes/otomi-api/commit/1dd56a55e0ddcd02707d25bbeb6b80bcd7531ea8)>)
- svc.useDefaultSubdomain should remove domain [ci skip](<[55f4032](https://github.com/redkubes/otomi-api/commit/55f4032c7355fb4186b4d3edb26543a10bf4361c)>)

### [0.4.7](https://github.com/redkubes/otomi-api/compare/v0.4.6...v0.4.7) (2020-07-25)

### Features

- add npm command to run harbor-init task ([c1e96d5](https://github.com/redkubes/otomi-api/commit/c1e96d5bd6b61f81e02a6365158a1fc93a78b7e0))
- add task to set harbor configuration ([e2a86e3](https://github.com/redkubes/otomi-api/commit/e2a86e3b70992a03c2a63cfa93d2844eba84c5d9))
- associate oidc group with project ([05fcf93](https://github.com/redkubes/otomi-api/commit/05fcf9341c487ba1d9b2255131729b79d0838bd7))
- build clients from openapi spec ([8f62fff](https://github.com/redkubes/otomi-api/commit/8f62fffaba30f7ba016b75c8e1cc53fa5248bd95))
- create harbor projects ([a38a8fc](https://github.com/redkubes/otomi-api/commit/a38a8fcd73eda00680519810ffc300e7a9f3b55b))
- get team list from env ([65885b8](https://github.com/redkubes/otomi-api/commit/65885b8bacf3701d9ea13f8511d6028bfc4dfd87))
- perform initial harbor configuration ([6b002f8](https://github.com/redkubes/otomi-api/commit/6b002f86d52efa0db2d111ab8111d6db640a93fe))
- validate env ([0ab115e](https://github.com/redkubes/otomi-api/commit/0ab115ec8b61b6ba2ba48653733554397c27c816))

### Bug Fixes

- add mising property to harbor api spec ([2aff468](https://github.com/redkubes/otomi-api/commit/2aff468589229e8eee9805b303ab387608d78270))
- dirty false after deployment [ci skip](<[cea4b57](https://github.com/redkubes/otomi-api/commit/cea4b57d62aa3a0a79b40f149037e0f4b764db7f)>)
- harbor api spec ([c7adb37](https://github.com/redkubes/otomi-api/commit/c7adb377f1c3463fd8055e3b114e7771d6083190))
- lint warning ToolsError [ci skip](<[9565c6b](https://github.com/redkubes/otomi-api/commit/9565c6bcc6a45a29d8056dcf3674e12711ffc06e)>)
- log on harbor client http error ([cb29aea](https://github.com/redkubes/otomi-api/commit/cb29aeac15fe4a618d2cf6fa903a5650e9821b25))
- updated core.yaml for dev [ci skip](<[58b0932](https://github.com/redkubes/otomi-api/commit/58b09325bbec7b95f4635d56bcf093bebcc42926)>)
- workflow now only tagging latest upon release [ci skip](<[6cddefa](https://github.com/redkubes/otomi-api/commit/6cddefa433f9873bd0c94319466a21e31529e5ab)>)

### CI

- use github token to access github packages ([16d18b7](https://github.com/redkubes/otomi-api/commit/16d18b7a2d87f2d16aecde6fba2f057a73c32cd1))

### Build System

- add NPM_TOKEN env dependency ([9e7ad77](https://github.com/redkubes/otomi-api/commit/9e7ad7708a1c64f2daa58515bd5d3c8aade09b7a))

### Others

- debug currently opened file ([2928490](https://github.com/redkubes/otomi-api/commit/29284906f541682ccf9ac7d3be939f8c5445d669))

### Code Refactoring

- do not use dot env ([eff6fe8](https://github.com/redkubes/otomi-api/commit/eff6fe8b7f74b9e85a6a3348276fe9f988390367))
- do not use dot env ([d5a73bc](https://github.com/redkubes/otomi-api/commit/d5a73bc5d7b4e2d5770e8e600a83d8e7215f344e))
- remove unused script ([c4a329b](https://github.com/redkubes/otomi-api/commit/c4a329b6e931d77c0f6e66758221402fa9e27dfe))

### Feature Improvements

- added feedback in case team project exists [ci skip](<[980726c](https://github.com/redkubes/otomi-api/commit/980726c0c879054f4db39b3d41fab31c649105a8)>)
- added feedback in case team project exists [ci skip](<[057cd6d](https://github.com/redkubes/otomi-api/commit/057cd6d64c7183320ae9705b65c21cdb022a32b2)>)
- tls secret CA field [ci skip](<[fdb497f](https://github.com/redkubes/otomi-api/commit/fdb497f994690088d124c3b5d248f4729caf4b2a)>)

### [0.4.6](https://github.com/redkubes/otomi-api/compare/v0.4.5...v0.4.6) (2020-07-07)

### Bug Fixes

- svc.paths array [ci skip](<[e6d216a](https://github.com/redkubes/otomi-api/commit/e6d216a61e158269ccb751a2b95093d8938c58c0)>)

### [0.4.5](https://github.com/redkubes/otomi-api/compare/v0.4.4...v0.4.5) (2020-07-07)

### Bug Fixes

- decrypt moment now before add files ([78e2832](https://github.com/redkubes/otomi-api/commit/78e2832cf81ecd67fec84612583fabba97a44fab))

### [0.4.4](https://github.com/redkubes/otomi-api/compare/v0.4.3...v0.4.4) (2020-07-06)

### Bug Fixes

- added docker compose files for tools server ([91bd02f](https://github.com/redkubes/otomi-api/commit/91bd02f09dc314c1f2985c4c65eb64298a66e616))
- cleaned [ci skip](<[5dc7cd6](https://github.com/redkubes/otomi-api/commit/5dc7cd6bc54b99c1ab766f99fae556f84cd8f8f0)>)
- disabled test ([377b1c1](https://github.com/redkubes/otomi-api/commit/377b1c1f9a2bd6bad52e014d454186ffc88d9c5e))
- disabled test: [#2](https://github.com/redkubes/otomi-api/issues/2) ([3bc1679](https://github.com/redkubes/otomi-api/commit/3bc167948146b1ae75b1c8db2f9d2b41ee5e0ac3))
- docker git dep [ci skip](<[d8032b5](https://github.com/redkubes/otomi-api/commit/d8032b567d79530331a6de9a143bceaa9e32d834)>)
- now removing old repo before clone ([92dfafc](https://github.com/redkubes/otomi-api/commit/92dfafcfdfa1080203ef57a3ce847ec0b2b91bbb))
- now removing old repo before clone: [#2](https://github.com/redkubes/otomi-api/issues/2) ([321ac52](https://github.com/redkubes/otomi-api/commit/321ac52306d11929ccdf5679a03139efbac4f31c))
- readme ([32d08f4](https://github.com/redkubes/otomi-api/commit/32d08f4603d9de1bf80c551a95c00cde2403687f))
- test exclusion flag for tools dep, readme updated ([17af5f8](https://github.com/redkubes/otomi-api/commit/17af5f849d2e5cbca9eb9d37c623a00437cfc182))

### [0.4.3](https://github.com/redkubes/otomi-api/compare/v0.4.2...v0.4.3) (2020-07-02)

### Bug Fixes

- docker now extending from tools image, bleh [#5](https://github.com/redkubes/otomi-api/issues/5) [ci skip](<[02db689](https://github.com/redkubes/otomi-api/commit/02db689b5f2f67f34c2a1ce6214ef34c18500951)>)

### [0.4.2](https://github.com/redkubes/otomi-api/compare/v0.4.1...v0.4.2) (2020-07-02)

### Bug Fixes

- docker now extending from tools image, bleh ([67cfced](https://github.com/redkubes/otomi-api/commit/67cfced8003816f635a2a29aa3c1b1a405f57751))
- docker now extending from tools image, bleh [#2](https://github.com/redkubes/otomi-api/issues/2) ([970cf60](https://github.com/redkubes/otomi-api/commit/970cf60e59e51cc81b1f572623ade34c531b94ee))
- docker now extending from tools image, bleh [#3](https://github.com/redkubes/otomi-api/issues/3) ([1973675](https://github.com/redkubes/otomi-api/commit/1973675edbe713df65a1331ec2e705a8dea9abed))
- docker now extending from tools image, bleh [#4](https://github.com/redkubes/otomi-api/issues/4) ([2114fe8](https://github.com/redkubes/otomi-api/commit/2114fe8bbe17327b954d686ba9a8b2181133b7e2))

### [0.4.1](https://github.com/redkubes/otomi-api/compare/v0.4.0...v0.4.1) (2020-07-02)

### Bug Fixes

- adding encryption step before commit [ci skip](<[7e19c5e](https://github.com/redkubes/otomi-api/commit/7e19c5e5c9c691aa7a0e697abb004a42e365d178)>)
- writefile + .enc ([382dce5](https://github.com/redkubes/otomi-api/commit/382dce5f10b6ecd6d9b317423572585b33c790fb))

## [0.4.0](https://github.com/redkubes/otomi-api/compare/v0.3.3...v0.4.0) (2020-07-02)

### CI

- updated core yaml
  [ci skip](<[b4807f6](https://github.com/redkubes/otomi-api/commit/b4807f60c494d54bfbf5f14fb82b5514b2022c77)>)

### [0.3.3](https://github.com/redkubes/otomi-api/compare/v0.3.2...v0.3.3) (2020-06-17)

### Bug Fixes

- namespace editable for admin
  ([4966aa7](https://github.com/redkubes/otomi-api/commit/4966aa778b8c2573ebe7662bccd54a53d7690569))

### [0.3.2](https://github.com/redkubes/otomi-api/compare/v0.3.1...v0.3.2) (2020-06-17)

### Bug Fixes

- eslint, acl for secrets
  ([4c6a293](https://github.com/redkubes/otomi-api/commit/4c6a293a04d2272043dd0a0fed6c292ba975bac3))

### [0.3.1](https://github.com/redkubes/otomi-api/compare/v0.3.0...v0.3.1) (2020-06-17)

### Bug Fixes

- missing secret handler
  [ci skip](<[75f2c3a](https://github.com/redkubes/otomi-api/commit/75f2c3a5ea3bc246f21c36ef8e2d960b121cecc4)>)

## [0.3.0](https://github.com/redkubes/otomi-api/compare/v0.2.29...v0.3.0) (2020-06-17)

### ⚠ BREAKING CHANGES

- The acl permissions are used by fronted

### Features

- a team can inspect others team settings
  ([ff1a3eb](https://github.com/redkubes/otomi-api/commit/ff1a3ebf60a500cdb5080dfb985d458fac5e02e4))
- add authorization
  ([3df67af](https://github.com/redkubes/otomi-api/commit/3df67afd86e9345beafe558b8b8280638bb80327))
- add authorization middleware
  ([40d0da3](https://github.com/redkubes/otomi-api/commit/40d0da3e1f1b63c3e5e8e8418ed4225e8dbcd0c5))
- add authorization rules to api spec
  ([2c7c3ff](https://github.com/redkubes/otomi-api/commit/2c7c3ffe96a6cd05c9502009e0c76981b2d62501))
- add new entry in .env
  ([38b1531](https://github.com/redkubes/otomi-api/commit/38b1531212dd06ff8e81cb62cddd967931374be8))
- add RBAC ([ed9492f](https://github.com/redkubes/otomi-api/commit/ed9492fbcd1328c80523efe73e14b3e9b3aed04b))
- add x-aclSchema to api spec
  ([702e394](https://github.com/redkubes/otomi-api/commit/702e394f3b1aa3d54878ba889263ef13c179cc47))
- authorize against fields
  ([1fcd8ca](https://github.com/redkubes/otomi-api/commit/1fcd8ca9e657584a5feb383a7794aa57e4b3a2fa))
- bundle api specs
  ([4807966](https://github.com/redkubes/otomi-api/commit/480796648d2599bff4fd95a43d51cc9ac617dc33))
- do not allow to change cluster after service is created
  ([ef46338](https://github.com/redkubes/otomi-api/commit/ef46338030448106f89cf413fa16ad31510a7867))
- enrich api spec validaiton
  ([f9aff5b](https://github.com/redkubes/otomi-api/commit/f9aff5b69ad6b33f822bf36aafabd8ca1007f856))
- generate team id
  ([03ff5a6](https://github.com/redkubes/otomi-api/commit/03ff5a6f3d6546e1b4e5e6f6ca013a5453603b1e))
- handle git pull exception
  ([f8ba4cf](https://github.com/redkubes/otomi-api/commit/f8ba4cf68a3153e127c6df028a4fa4e803284335))
- ignore schemas that does not have property key
  ([f8a1e8e](https://github.com/redkubes/otomi-api/commit/f8a1e8e438ba0d7ca682ebfdc90342a69d3a2289))
- move schema helpers to separate section
  ([1403aae](https://github.com/redkubes/otomi-api/commit/1403aae04633fc424145dd847f11d99196aab3b2))
- move schemas to separate files
  ([73118f3](https://github.com/redkubes/otomi-api/commit/73118f3936953d62257b4752e74444d4efe887b0))
- pull changes from remote branch before pushing
  ([47308be](https://github.com/redkubes/otomi-api/commit/47308be5d23af36ddf12e83c73c1a77b066080d8))
- remove logo from api spec
  ([c6f04d4](https://github.com/redkubes/otomi-api/commit/c6f04d43f1fdb10f765df1c133335fb22ae4a359))
- remove ownershipCondition for ABAC
  ([5bd20a2](https://github.com/redkubes/otomi-api/commit/5bd20a2e4c6f91e27496e662b814b4394c198b39))
- remove unnecessary validation
  ([a1394f2](https://github.com/redkubes/otomi-api/commit/a1394f2d0d69bcf8a21fadcde07429bd993a872b))
- skip ABAC for delete, get and post actions
  ([acf861f](https://github.com/redkubes/otomi-api/commit/acf861ff1642032c2c0a8f6f86375d3e6e0b070c))
- skip actions that are not applicable for resource attributes
  ([de060aa](https://github.com/redkubes/otomi-api/commit/de060aa340a2515dcafcf7f665234cbc5d3c299c))
- skip schemas that do not contain properties attribute
  ([69ad08b](https://github.com/redkubes/otomi-api/commit/69ad08b063b58c4f67e586c7c1160b773e1ef661))
- split functionallity to either clone or init repo
  ([fa5e0c0](https://github.com/redkubes/otomi-api/commit/fa5e0c0aaf1e3584b496127cc5b1be380fa568c2))
- strip data attributes
  ([63267fb](https://github.com/redkubes/otomi-api/commit/63267fb171ac44a174d2753befa5f2242c17a91d))
- transform schema actions to property actions
  ([21f9689](https://github.com/redkubes/otomi-api/commit/21f96893775181419d7ac283e414c2d77eb0dbdf))
- update instead of replace data in db
  ([529b0c8](https://github.com/redkubes/otomi-api/commit/529b0c87ee56adebc3ce66269a9b4e10f6d6cbe0))
- use can and cannot statements for authorization
  ([056a083](https://github.com/redkubes/otomi-api/commit/056a0830a208b38fa9a5c1187d1d22cba4f823cb))
- validate api spec against authz configuration
  ([a2dc1ba](https://github.com/redkubes/otomi-api/commit/a2dc1ba8782643ae6a92da76b183e231736d0969))

### Bug Fixes

- added api yaml to watch
  [ci skip](<[1b16662](https://github.com/redkubes/otomi-api/commit/1b16662f567b42584d305d2eccda82b5b6ab1b7d)>)
- authz permission check
  ([89768cd](https://github.com/redkubes/otomi-api/commit/89768cde9b9720cbd2a1d693728b1706c30763a9))
- better error catching
  ([714683d](https://github.com/redkubes/otomi-api/commit/714683d7bdaf7f5af683cc6f5014e13546099d96))
- change ABAC ([ed6a813](https://github.com/redkubes/otomi-api/commit/ed6a813db92891ad5033b5d22214211212a7e12f))
- copy directory with openapi spec
  ([dd3d138](https://github.com/redkubes/otomi-api/commit/dd3d1385ac6e3eb068bbf9c4da2b77628b6048f5))
- new id scheme fixes
  ([dccca74](https://github.com/redkubes/otomi-api/commit/dccca74faa715406df0985fe1e738506c474e886))
- path setup
  [ci skip](<[c65eefc](https://github.com/redkubes/otomi-api/commit/c65eefc813450758d9016843c21c5cc0d776dd4b)>)
- tmp ([0a5cb10](https://github.com/redkubes/otomi-api/commit/0a5cb1007442806f833441e0b162204b1c3f7c0a))
- **api.yaml:** fix wrong param in /services
  ([41971cc](https://github.com/redkubes/otomi-api/commit/41971cc80e0ece54b353bd7d30ef127b83decfec))
- provide indpenendet copy of data from db
  ([1453d76](https://github.com/redkubes/otomi-api/commit/1453d766840f09237772c4a39281f513b0adfa70))
- provide only request data to authz module
  ([92aa597](https://github.com/redkubes/otomi-api/commit/92aa5973081c0f8101aaa141efe272b2489f9e55))
- reject requests that does not have required headers
  ([79d35a9](https://github.com/redkubes/otomi-api/commit/79d35a94c0045a8fed080667409ae8a1e239dd79))
- stubbed tests ([e0a0b3b](https://github.com/redkubes/otomi-api/commit/e0a0b3bc0e27479dffaa6b2b710da0551e0dcff4))
- turned tests back on
  [ci skip](<[d7fdac9](https://github.com/redkubes/otomi-api/commit/d7fdac9955325406f92c59f86578fed6fb8705e8)>)
- upadte api spec
  ([bb294f1](https://github.com/redkubes/otomi-api/commit/bb294f18dc89d25635d49b61d3511092c20e2693))

### Docs

- describe authentication and authorization framework
  ([f151793](https://github.com/redkubes/otomi-api/commit/f151793c9261e0ef4a93636b5dc91688c8811f45))
- update section about api authorization
  ([d7bab24](https://github.com/redkubes/otomi-api/commit/d7bab241c9e4d678fc2bb279bc49e593a96f2f7a))

### Others

- add configuration for app debugging
  ([90a1ff9](https://github.com/redkubes/otomi-api/commit/90a1ff9e669d7612211d5a9f770d175cfde599f6))
- add script for stubbing git remote origin
  ([4c870da](https://github.com/redkubes/otomi-api/commit/4c870dac0a9f0c1e805b81e01c8f869f67bc7b9d))
- add test explorer plugin
  ([46fe408](https://github.com/redkubes/otomi-api/commit/46fe408cd4d714ec435e9d8f21ba84857d8f0cda))
- add types for lowdb
  ([d89ad11](https://github.com/redkubes/otomi-api/commit/d89ad1196b8650462e82fe34c9cb1073404db771))
- change vscode lunch configuration
  ([0c5b229](https://github.com/redkubes/otomi-api/commit/0c5b22972f54c980798ed84359b02e16eda1aa44))

### Tests

- add api authorization tests
  ([b1fcd08](https://github.com/redkubes/otomi-api/commit/b1fcd08bd4a7bb9bc04c6263eef5947137781baf))
- check if team/admin can perform deployment
  ([049fc2c](https://github.com/redkubes/otomi-api/commit/049fc2ca71218946a5bba671f6994219a25da3e6))
- check repo functionallity
  ([d8e073d](https://github.com/redkubes/otomi-api/commit/d8e073d830c421bfdcdc8c281744b8029f2319bf))
- init api server only if a a given is to executed
  ([78bfed5](https://github.com/redkubes/otomi-api/commit/78bfed5a82d3db4f49dfb2ba320996d2682a7010))

### CI

- new workflow for releasing
  [ci skip](<[ae4efe6](https://github.com/redkubes/otomi-api/commit/ae4efe6d84f7849d6c64c0e0838b53f692916c0e)>)

### Feature Improvements

- added path to url check
  [ci skip](<[edeb9bf](https://github.com/redkubes/otomi-api/commit/edeb9bf111f6c48753c3e0f9b22a770deae85cf7)>)
- added pullsecret creation to api
  ([660272d](https://github.com/redkubes/otomi-api/commit/660272d593794b482b563fd14d3e98515592d3a3))
- added scaleToZero, path validation
  [ci skip](<[f0cfb19](https://github.com/redkubes/otomi-api/commit/f0cfb198a71fcce2796c4b0a35f959097c1aa155)>)
- now using kubectl client for kubecfg download
  ([e464bc1](https://github.com/redkubes/otomi-api/commit/e464bc145f0be374dd84292b18ed8fae626545fe))
- refactored ids
  ([98acabf](https://github.com/redkubes/otomi-api/commit/98acabf15b2f09925bc860da097916b3b9f3cd10))
- refactored ids: [#2](https://github.com/redkubes/otomi-api/issues/2)
  ([fa20ee7](https://github.com/redkubes/otomi-api/commit/fa20ee7f0d3c18e550a5fc9c5e3edb558b67a12e))

### Code Refactoring

- added secrets and id to attributes api spec
  ([e925aa7](https://github.com/redkubes/otomi-api/commit/e925aa7b9be345f72c48703668a0889fbb1a2010))
- move authorization code to separate function
  ([955c25a](https://github.com/redkubes/otomi-api/commit/955c25ac11b597cd69d2fc291c1d42c4a9e60290))
- reuse db method
  ([eceac7b](https://github.com/redkubes/otomi-api/commit/eceac7b7d34c06d99cbfce2d6e228e8da42737c9))
- use common parameters in api spec
  ([5fe9276](https://github.com/redkubes/otomi-api/commit/5fe9276a21a905adb07fd9b906d1d465e9023c9a))
- use CRUD naming for authorization
  ([df6eba7](https://github.com/redkubes/otomi-api/commit/df6eba7d19685cb821c3ca3309f2c4fb3597714c))
- use team id ([d6b1975](https://github.com/redkubes/otomi-api/commit/d6b1975306dc5a27f2993c8905f292aad4c2f2e7))

### Build System

- install git before running functional tests
  ([ded6c1f](https://github.com/redkubes/otomi-api/commit/ded6c1ffec2079fe7a69336604bb9b0c6baeab47))
- throw error if nothing is copied
  ([73e41c1](https://github.com/redkubes/otomi-api/commit/73e41c155ec885f7dbffc7066503d68ab97ac32e))

### [0.2.29](https://github.com/redkubes/otomi-api/compare/v0.2.28...v0.2.29) (2020-05-14)

### Bug Fixes

- download file name with teamId
  [ci skip](<[96d4599](https://github.com/redkubes/otomi-api/commit/96d4599f9391f64b40284e5b58fa0632b2aee8d7)>)

### [0.2.28](https://github.com/redkubes/otomi-api/compare/v0.2.27...v0.2.28) (2020-05-13)

### Bug Fixes

- os dependend base64 decode
  [ci skip](<[57d61a8](https://github.com/redkubes/otomi-api/commit/57d61a8151bec887e16b4731a847e69fe1566fd6)>)
- os dependend base64 decode
  [ci skip](<[c7b2568](https://github.com/redkubes/otomi-api/commit/c7b25689e3d745fc459838a96474730f07044348)>)

### [0.2.27](https://github.com/redkubes/otomi-api/compare/v0.2.26...v0.2.27) (2020-05-13)

### Bug Fixes

- adding jq to docker
  [ci skip](<[c317352](https://github.com/redkubes/otomi-api/commit/c317352fe98553da8918da8550a96c136cac0c81)>)

### [0.2.26](https://github.com/redkubes/otomi-api/compare/v0.2.25...v0.2.26) (2020-05-13)

### Bug Fixes

- bin in dockerfile
  [ci skip](<[0cde5fa](https://github.com/redkubes/otomi-api/commit/0cde5fa6135ff5b9a89d298547e929bf3bdd902f)>)

### [0.2.25](https://github.com/redkubes/otomi-api/compare/v0.2.24...v0.2.25) (2020-05-13)

### Bug Fixes

- node needed to accept bigger header size
  ([8eaf035](https://github.com/redkubes/otomi-api/commit/8eaf035aa7178a1bec87868bc8f8c5e54fee36e1))

### [0.2.24](https://github.com/redkubes/otomi-api/compare/v0.2.23...v0.2.24) (2020-05-13)

### Bug Fixes

- api path ([14af05d](https://github.com/redkubes/otomi-api/commit/14af05db702c963ccaefffc38b1bfb0e8418a7ef))
- download fix ([a830893](https://github.com/redkubes/otomi-api/commit/a83089366809c7e13f20f9b6b71b1b24050520ac))

### Code Refactoring

- migrate missing files to typescript
  ([001dd25](https://github.com/redkubes/otomi-api/commit/001dd25e23b7751b46c0d2d07ab593a492dfde06))
- use typescript
  ([10233af](https://github.com/redkubes/otomi-api/commit/10233af8fdda3bc5c7757ab48d16beeb3265f3d2))

### Others

- committing ([bd02a99](https://github.com/redkubes/otomi-api/commit/bd02a9971221d72c708ac4dc5c97f70d3bdf2952))

### [0.2.23](https://github.com/redkubes/otomi-api/compare/v0.2.22...v0.2.23) (2020-05-01)

### Feature Improvements

- added DISABLE_SYNC to disable git push
  [ci skip](<[5d232fc](https://github.com/redkubes/otomi-api/commit/5d232fc94b311e47615c5139e8c32f41188314ed)>)

### [0.2.22](https://github.com/redkubes/otomi-api/compare/v0.2.21...v0.2.22) (2020-05-01)

### Bug Fixes

- missing path fields
  [ci skip](<[9e96a02](https://github.com/redkubes/otomi-api/commit/9e96a024c6b69c6f054e7603ed973f350a9a7b15)>)

### [0.2.21](https://github.com/redkubes/otomi-api/compare/v0.2.20...v0.2.21) (2020-04-24)

### Bug Fixes

- description field
  [ci skip](<[16806ba](https://github.com/redkubes/otomi-api/commit/16806ba4ca598d65fe29e35a4744386b7c353298)>)

### [0.2.20](https://github.com/redkubes/otomi-api/compare/v0.2.19...v0.2.20) (2020-04-24)

### Bug Fixes

- internal flag was cloned
  [ci skip](<[ecc9e05](https://github.com/redkubes/otomi-api/commit/ecc9e0593d509566245db0f72a592270d6a2f78b)>)

### [0.2.19](https://github.com/redkubes/otomi-api/compare/v0.2.18...v0.2.19) (2020-04-23)

### Bug Fixes

- boolean fix
  [ci skip](<[0517014](https://github.com/redkubes/otomi-api/commit/05170143746427a1253bcb5127f68e80e1295c0a)>)

### [0.2.18](https://github.com/redkubes/otomi-api/compare/v0.2.17...v0.2.18) (2020-04-23)

### Bug Fixes

- enabling api deploy again
  c[skip](<[aadd56b](https://github.com/redkubes/otomi-api/commit/aadd56bae3fd8e1a4eb48d3ae71706f650e548ba)>)
- enabling api deploy again
  c[skip](<[76318a4](https://github.com/redkubes/otomi-api/commit/76318a4fcc0cd8144a9a1ae6fc945b8c6178f9a9)>)

### [0.2.17](https://github.com/redkubes/otomi-api/compare/v0.2.15...v0.2.17) (2020-04-23)

### Features

- add new fields to cluster schema
  ([7528457](https://github.com/redkubes/otomi-api/commit/7528457f67a610f2208bc37449ba22d3f96e7093))
- add new fields to cluster schema ([#64](https://github.com/redkubes/otomi-api/issues/64))
  ([3f3e1c1](https://github.com/redkubes/otomi-api/commit/3f3e1c1c0aed6b8cc5ff4d711c4f4b313d20012c))

### Bug Fixes

- node env, added hide flag to auth
  [ci skip](<[f61d2f8](https://github.com/redkubes/otomi-api/commit/f61d2f84b0dc1958ee0ad92fc4cc6e1bada4b10d)>)
- put host in front of dns zone
  ([85e0e02](https://github.com/redkubes/otomi-api/commit/85e0e021ce77aca65f646ee303d48e67ca90af66))

### Build System

- indicate that package is private
  ([fbda887](https://github.com/redkubes/otomi-api/commit/fbda8874547e5d2d517d0f307b455fdf199d851c))

### Others

- **release:** 0.2.16
  ([d17d290](https://github.com/redkubes/otomi-api/commit/d17d290f7eceb7f1e9bed3c26bdc5fc58d75f657))
- disable yaml formmater that conflicts with eslint
  ([b330227](https://github.com/redkubes/otomi-api/commit/b33022789120152850c731613968dae615184a58))

### [0.2.16](https://github.com/redkubes/otomi-api/compare/v0.2.15...v0.2.16) (2020-04-23)

### Features

- add new fields to cluster schema ([#64](https://github.com/redkubes/otomi-api/issues/64))
  ([3f3e1c1](https://github.com/redkubes/otomi-api/commit/3f3e1c1c0aed6b8cc5ff4d711c4f4b313d20012c))

### Bug Fixes

- node env, added hide flag to auth
  [ci skip](<[f61d2f8](https://github.com/redkubes/otomi-api/commit/f61d2f84b0dc1958ee0ad92fc4cc6e1bada4b10d)>)

### Build System

- indicate that package is private
  ([fbda887](https://github.com/redkubes/otomi-api/commit/fbda8874547e5d2d517d0f307b455fdf199d851c))

### Others

- disable yaml formmater that conflicts with eslint
  ([b330227](https://github.com/redkubes/otomi-api/commit/b33022789120152850c731613968dae615184a58))

### [0.2.15](https://github.com/redkubes/otomi-api/compare/v0.2.14...v0.2.15) (2020-04-21)

### Bug Fixes

- add enum with one value to tagMatcher
  ([82ea358](https://github.com/redkubes/otomi-api/commit/82ea358079f5f85a05d98b18427814f00ba50a75))
- add serviceType field to api spec
  ([9eff626](https://github.com/redkubes/otomi-api/commit/9eff626347b55801904618ed4df97525567b87c6))

### [0.2.14](https://github.com/redkubes/otomi-api/compare/v0.2.13...v0.2.14) (2020-04-21)

### [0.2.13](https://github.com/redkubes/otomi-api/compare/v0.2.12...v0.2.13) (2020-04-21)

### [0.2.12](https://github.com/redkubes/otomi-api/compare/v0.2.11...v0.2.12) (2020-04-20)

### Bug Fixes

- corrected NODE_ENV now in Dockerfile...dohhhh!
  [ci skip](<[2ca4bc8](https://github.com/redkubes/otomi-api/commit/2ca4bc84cbc553edd8163241384ef82c2abcba29)>)

### [0.2.11](https://github.com/redkubes/otomi-api/compare/v0.2.10...v0.2.11) (2020-04-20)

### Bug Fixes

- corrected NODE_ENV now in Dockerfile...doh!
  [ci skip](<[55ed81f](https://github.com/redkubes/otomi-api/commit/55ed81fddb1c7ef2989c713188f7b7728ed5a4b0)>)

### [0.2.10](https://github.com/redkubes/otomi-api/compare/v0.2.9...v0.2.10) (2020-04-20)

### Bug Fixes

- corrected NODE_ENV
  [ci skip](<[03eed5b](https://github.com/redkubes/otomi-api/commit/03eed5b1f518ffee114c6ff51095581e2bb19d5a)>)

### [0.2.9](https://github.com/redkubes/otomi-api/compare/v0.2.8...v0.2.9) (2020-04-20)

### Bug Fixes

- corrected NODE_ENV check
  [ci skip](<[b8345ae](https://github.com/redkubes/otomi-api/commit/b8345ae5ff23b03a97e6571e66fb6b46a805ebad)>)

### [0.2.8](https://github.com/redkubes/otomi-api/compare/v0.2.7...v0.2.8) (2020-04-20)

### Features

- use dnsZones field
  ([8883900](https://github.com/redkubes/otomi-api/commit/88839001002bac124107c4fee2bd16d6631b1a55))

### Bug Fixes

- missing dev file
  [ci skip](<[8ca087a](https://github.com/redkubes/otomi-api/commit/8ca087a3f133b9cdca9b26f86a72639139cefd2b)>)
- updateItem
  [ci skip](<[c7c3572](https://github.com/redkubes/otomi-api/commit/c7c3572583efa7a2a835a80f4dfa807e1f4a1828)>)

### [0.2.7](https://github.com/redkubes/otomi-api/compare/v0.2.6...v0.2.7) (2020-04-19)

### Feature Improvements

- added currentClusterId
  [ci skip](<[c6afb9b](https://github.com/redkubes/otomi-api/commit/c6afb9ba3515f8b6bc68f24a922a3f410d23168a)>)

### [0.2.6](https://github.com/redkubes/otomi-api/compare/v0.2.5...v0.2.6) (2020-04-19)

### Features

- add multi dns zone support
  ([d915257](https://github.com/redkubes/otomi-api/commit/d91525777c8ca3faa004562291ef51715da8bdb0))
- load and dump service domain
  ([8d1a46f](https://github.com/redkubes/otomi-api/commit/8d1a46f4abc5489a69dfd64c4d7ef116cbb6433f))
- validate subdomain against duplicates
  ([68e4994](https://github.com/redkubes/otomi-api/commit/68e4994eed4a7d0f9c1a394572a84548e377179c))

### Bug Fixes

- allow for custom domain that is not mentioned in clusters.yaml
  ([d8745f7](https://github.com/redkubes/otomi-api/commit/d8745f775c3fadbe9f454b30e66b690f1a447489))
- apiDoc was broken
  ([76925c5](https://github.com/redkubes/otomi-api/commit/76925c52edc9e83d82a076a6e990a16138425d6c))
- bug fix for http errors
  ([48d06fc](https://github.com/redkubes/otomi-api/commit/48d06fce60831ebd0527a7abeb3fefe82f3b6223))
- change cluster schema definition
  ([a03db21](https://github.com/redkubes/otomi-api/commit/a03db213d245eee6833195a061e8878c416ae4d7))
- check whole url against duplicates
  ([1c66ba1](https://github.com/redkubes/otomi-api/commit/1c66ba1649c30cba1a0456a358aa7c01363e9dcb))
- many ([140dd2a](https://github.com/redkubes/otomi-api/commit/140dd2a63cdf4f25c35198f8a1b57a6bd02016ea))
- many ([499964e](https://github.com/redkubes/otomi-api/commit/499964ee8931512b2e029a2c63ed9d21da54b213))
- many ([70717ed](https://github.com/redkubes/otomi-api/commit/70717edb015cabc15ec7cb963b6608d706550405))
- many fixes before demo
  ([ec9e7f1](https://github.com/redkubes/otomi-api/commit/ec9e7f1eb2b845957213bdc442c0eadd3c5f3ed5))
- otomi-stack tests
  ([78bc5c1](https://github.com/redkubes/otomi-api/commit/78bc5c1598f9f733fe1f171215bf2590a81184dd))
- package
  [ci skip](<[0249e33](https://github.com/redkubes/otomi-api/commit/0249e332df7ada174971a57d3c26ac6e766c8639)>)
- package
  [ci skip](<[581ca6f](https://github.com/redkubes/otomi-api/commit/581ca6f59304c0bdf50e56099006f07b1f1d39c4)>)
- package
  [ci skip](<[5f32e89](https://github.com/redkubes/otomi-api/commit/5f32e897a75a2d99fc64a22d67b858490beac12b)>)
- teamId or name not set
  ([0c9a2cf](https://github.com/redkubes/otomi-api/commit/0c9a2cfb8e8154d4e1239e61e6ec243bba359a04))
- test fix
  [ci skip](<[6512810](https://github.com/redkubes/otomi-api/commit/6512810f33b577e7b31a0968e4887fab515e5acf)>)
- tests fixed, structure simplified
  ([d8334f1](https://github.com/redkubes/otomi-api/commit/d8334f17934cdb8dd56e4d9d12e402b8d6f3ab9a))

### Others

- refactored some code
  [ci skip](<[b2978eb](https://github.com/redkubes/otomi-api/commit/b2978eb5d4fd05c80650ae9a08b2b26ea99b19d9)>)

### Tests

- skip tests due to removed functionallity
  ([e4b3910](https://github.com/redkubes/otomi-api/commit/e4b3910c7c564ee71e55169ae01d2dd3296c3307))
- validate api spec
  ([0aff415](https://github.com/redkubes/otomi-api/commit/0aff41572ff422dc349e9730f8cfb6bcbba97fdf))

### Build System

- enable tests ([7d8d8b4](https://github.com/redkubes/otomi-api/commit/7d8d8b4dfe0196946692b171ba7be5a0bdb804d7))

### Code Refactoring

- code rework after review
  ([fa18d96](https://github.com/redkubes/otomi-api/commit/fa18d9691054d1760908c756cdfbdbbc3315d8a5))
- remarks from review
  ([fcc183d](https://github.com/redkubes/otomi-api/commit/fcc183ddd40071eb223d3969bd21ee42885e529f))

### [0.2.8](https://github.com/redkubes/otomi-api/compare/v0.2.5...v0.2.8) (2020-04-19)

### Features

- add multi dns zone support
  ([d915257](https://github.com/redkubes/otomi-api/commit/d91525777c8ca3faa004562291ef51715da8bdb0))
- load and dump service domain
  ([8d1a46f](https://github.com/redkubes/otomi-api/commit/8d1a46f4abc5489a69dfd64c4d7ef116cbb6433f))
- validate subdomain against duplicates
  ([68e4994](https://github.com/redkubes/otomi-api/commit/68e4994eed4a7d0f9c1a394572a84548e377179c))

### Bug Fixes

- allow for custom domain that is not mentioned in clusters.yaml
  ([d8745f7](https://github.com/redkubes/otomi-api/commit/d8745f775c3fadbe9f454b30e66b690f1a447489))
- apiDoc was broken
  ([76925c5](https://github.com/redkubes/otomi-api/commit/76925c52edc9e83d82a076a6e990a16138425d6c))
- bug fix for http errors
  ([48d06fc](https://github.com/redkubes/otomi-api/commit/48d06fce60831ebd0527a7abeb3fefe82f3b6223))
- change cluster schema definition
  ([a03db21](https://github.com/redkubes/otomi-api/commit/a03db213d245eee6833195a061e8878c416ae4d7))
- check whole url against duplicates
  ([1c66ba1](https://github.com/redkubes/otomi-api/commit/1c66ba1649c30cba1a0456a358aa7c01363e9dcb))
- many ([140dd2a](https://github.com/redkubes/otomi-api/commit/140dd2a63cdf4f25c35198f8a1b57a6bd02016ea))
- many ([499964e](https://github.com/redkubes/otomi-api/commit/499964ee8931512b2e029a2c63ed9d21da54b213))
- many ([70717ed](https://github.com/redkubes/otomi-api/commit/70717edb015cabc15ec7cb963b6608d706550405))
- many fixes before demo
  ([ec9e7f1](https://github.com/redkubes/otomi-api/commit/ec9e7f1eb2b845957213bdc442c0eadd3c5f3ed5))
- otomi-stack tests
  ([78bc5c1](https://github.com/redkubes/otomi-api/commit/78bc5c1598f9f733fe1f171215bf2590a81184dd))
- teamId or name not set
  ([0c9a2cf](https://github.com/redkubes/otomi-api/commit/0c9a2cfb8e8154d4e1239e61e6ec243bba359a04))
- test fix
  [ci skip](<[6512810](https://github.com/redkubes/otomi-api/commit/6512810f33b577e7b31a0968e4887fab515e5acf)>)
- tests fixed, structure simplified
  ([d8334f1](https://github.com/redkubes/otomi-api/commit/d8334f17934cdb8dd56e4d9d12e402b8d6f3ab9a))

### Others

- refactored some code
  [ci skip](<[b2978eb](https://github.com/redkubes/otomi-api/commit/b2978eb5d4fd05c80650ae9a08b2b26ea99b19d9)>)

### Tests

- skip tests due to removed functionallity
  ([e4b3910](https://github.com/redkubes/otomi-api/commit/e4b3910c7c564ee71e55169ae01d2dd3296c3307))
- validate api spec
  ([0aff415](https://github.com/redkubes/otomi-api/commit/0aff41572ff422dc349e9730f8cfb6bcbba97fdf))

### Build System

- enable tests ([7d8d8b4](https://github.com/redkubes/otomi-api/commit/7d8d8b4dfe0196946692b171ba7be5a0bdb804d7))

### Code Refactoring

- code rework after review
  ([fa18d96](https://github.com/redkubes/otomi-api/commit/fa18d9691054d1760908c756cdfbdbbc3315d8a5))
- remarks from review
  ([fcc183d](https://github.com/redkubes/otomi-api/commit/fcc183ddd40071eb223d3969bd21ee42885e529f))

### [0.2.7](https://github.com/redkubes/otomi-api/compare/v0.2.5...v0.2.7) (2020-04-19)

### Features

- add multi dns zone support
  ([d915257](https://github.com/redkubes/otomi-api/commit/d91525777c8ca3faa004562291ef51715da8bdb0))
- load and dump service domain
  ([8d1a46f](https://github.com/redkubes/otomi-api/commit/8d1a46f4abc5489a69dfd64c4d7ef116cbb6433f))
- validate subdomain against duplicates
  ([68e4994](https://github.com/redkubes/otomi-api/commit/68e4994eed4a7d0f9c1a394572a84548e377179c))

### Bug Fixes

- allow for custom domain that is not mentioned in clusters.yaml
  ([d8745f7](https://github.com/redkubes/otomi-api/commit/d8745f775c3fadbe9f454b30e66b690f1a447489))
- apiDoc was broken
  ([76925c5](https://github.com/redkubes/otomi-api/commit/76925c52edc9e83d82a076a6e990a16138425d6c))
- bug fix for http errors
  ([48d06fc](https://github.com/redkubes/otomi-api/commit/48d06fce60831ebd0527a7abeb3fefe82f3b6223))
- change cluster schema definition
  ([a03db21](https://github.com/redkubes/otomi-api/commit/a03db213d245eee6833195a061e8878c416ae4d7))
- check whole url against duplicates
  ([1c66ba1](https://github.com/redkubes/otomi-api/commit/1c66ba1649c30cba1a0456a358aa7c01363e9dcb))
- many ([140dd2a](https://github.com/redkubes/otomi-api/commit/140dd2a63cdf4f25c35198f8a1b57a6bd02016ea))
- many ([499964e](https://github.com/redkubes/otomi-api/commit/499964ee8931512b2e029a2c63ed9d21da54b213))
- many ([70717ed](https://github.com/redkubes/otomi-api/commit/70717edb015cabc15ec7cb963b6608d706550405))
- many fixes before demo
  ([ec9e7f1](https://github.com/redkubes/otomi-api/commit/ec9e7f1eb2b845957213bdc442c0eadd3c5f3ed5))
- otomi-stack tests
  ([78bc5c1](https://github.com/redkubes/otomi-api/commit/78bc5c1598f9f733fe1f171215bf2590a81184dd))
- teamId or name not set
  ([0c9a2cf](https://github.com/redkubes/otomi-api/commit/0c9a2cfb8e8154d4e1239e61e6ec243bba359a04))
- test fix
  [ci skip](<[6512810](https://github.com/redkubes/otomi-api/commit/6512810f33b577e7b31a0968e4887fab515e5acf)>)
- tests fixed, structure simplified
  ([d8334f1](https://github.com/redkubes/otomi-api/commit/d8334f17934cdb8dd56e4d9d12e402b8d6f3ab9a))

### Others

- refactored some code
  [ci skip](<[b2978eb](https://github.com/redkubes/otomi-api/commit/b2978eb5d4fd05c80650ae9a08b2b26ea99b19d9)>)

### Tests

- skip tests due to removed functionallity
  ([e4b3910](https://github.com/redkubes/otomi-api/commit/e4b3910c7c564ee71e55169ae01d2dd3296c3307))
- validate api spec
  ([0aff415](https://github.com/redkubes/otomi-api/commit/0aff41572ff422dc349e9730f8cfb6bcbba97fdf))

### Build System

- enable tests ([7d8d8b4](https://github.com/redkubes/otomi-api/commit/7d8d8b4dfe0196946692b171ba7be5a0bdb804d7))

### Code Refactoring

- code rework after review
  ([fa18d96](https://github.com/redkubes/otomi-api/commit/fa18d9691054d1760908c756cdfbdbbc3315d8a5))
- remarks from review
  ([fcc183d](https://github.com/redkubes/otomi-api/commit/fcc183ddd40071eb223d3969bd21ee42885e529f))

### [0.2.6](https://github.com/redkubes/otomi-api/compare/v0.2.5...v0.2.6) (2020-04-19)

### Features

- add multi dns zone support
  ([d915257](https://github.com/redkubes/otomi-api/commit/d91525777c8ca3faa004562291ef51715da8bdb0))
- load and dump service domain
  ([8d1a46f](https://github.com/redkubes/otomi-api/commit/8d1a46f4abc5489a69dfd64c4d7ef116cbb6433f))
- validate subdomain against duplicates
  ([68e4994](https://github.com/redkubes/otomi-api/commit/68e4994eed4a7d0f9c1a394572a84548e377179c))

### Bug Fixes

- allow for custom domain that is not mentioned in clusters.yaml
  ([d8745f7](https://github.com/redkubes/otomi-api/commit/d8745f775c3fadbe9f454b30e66b690f1a447489))
- apiDoc was broken
  ([76925c5](https://github.com/redkubes/otomi-api/commit/76925c52edc9e83d82a076a6e990a16138425d6c))
- bug fix for http errors
  ([48d06fc](https://github.com/redkubes/otomi-api/commit/48d06fce60831ebd0527a7abeb3fefe82f3b6223))
- change cluster schema definition
  ([a03db21](https://github.com/redkubes/otomi-api/commit/a03db213d245eee6833195a061e8878c416ae4d7))
- check whole url against duplicates
  ([1c66ba1](https://github.com/redkubes/otomi-api/commit/1c66ba1649c30cba1a0456a358aa7c01363e9dcb))
- many ([499964e](https://github.com/redkubes/otomi-api/commit/499964ee8931512b2e029a2c63ed9d21da54b213))
- many ([70717ed](https://github.com/redkubes/otomi-api/commit/70717edb015cabc15ec7cb963b6608d706550405))
- many fixes before demo
  ([ec9e7f1](https://github.com/redkubes/otomi-api/commit/ec9e7f1eb2b845957213bdc442c0eadd3c5f3ed5))
- otomi-stack tests
  ([78bc5c1](https://github.com/redkubes/otomi-api/commit/78bc5c1598f9f733fe1f171215bf2590a81184dd))
- teamId or name not set
  ([0c9a2cf](https://github.com/redkubes/otomi-api/commit/0c9a2cfb8e8154d4e1239e61e6ec243bba359a04))
- tests fixed, structure simplified
  ([d8334f1](https://github.com/redkubes/otomi-api/commit/d8334f17934cdb8dd56e4d9d12e402b8d6f3ab9a))

### Others

- refactored some code
  [ci skip](<[b2978eb](https://github.com/redkubes/otomi-api/commit/b2978eb5d4fd05c80650ae9a08b2b26ea99b19d9)>)

### Tests

- skip tests due to removed functionallity
  ([e4b3910](https://github.com/redkubes/otomi-api/commit/e4b3910c7c564ee71e55169ae01d2dd3296c3307))
- validate api spec
  ([0aff415](https://github.com/redkubes/otomi-api/commit/0aff41572ff422dc349e9730f8cfb6bcbba97fdf))

### Build System

- enable tests ([7d8d8b4](https://github.com/redkubes/otomi-api/commit/7d8d8b4dfe0196946692b171ba7be5a0bdb804d7))

### Code Refactoring

- code rework after review
  ([fa18d96](https://github.com/redkubes/otomi-api/commit/fa18d9691054d1760908c756cdfbdbbc3315d8a5))
- remarks from review
  ([fcc183d](https://github.com/redkubes/otomi-api/commit/fcc183ddd40071eb223d3969bd21ee42885e529f))

### [0.2.5](https://github.com/redkubes/otomi-api/compare/v0.2.4...v0.2.5) (2020-04-14)

### Styling

- implementing suggestions
  [ci skip](<[b1aa8f0](https://github.com/redkubes/otomi-api/commit/b1aa8f00f61e800fa2b768d542b177a3037f55c3)>)

### [0.2.4](https://github.com/redkubes/otomi-api/compare/v0.2.3...v0.2.4) (2020-04-14)

### Bug Fixes

- svc name fix
  [ci skip](<[9dabfbe](https://github.com/redkubes/otomi-api/commit/9dabfbe3414422ac7fbbe15ee3b463879a2775f7)>)

### [0.2.3](https://github.com/redkubes/otomi-api/compare/v0.2.2...v0.2.3) (2020-04-14)

### Bug Fixes

- name for service
  [ci skip](<[80a19d1](https://github.com/redkubes/otomi-api/commit/80a19d159b60d1a5430c8107d723d8edef1ce1c2)>)

### [0.2.2](https://github.com/redkubes/otomi-api/compare/v0.2.1...v0.2.2) (2020-04-14)

### Bug Fixes

- repo not initialized
  [ci skip](<[7992973](https://github.com/redkubes/otomi-api/commit/7992973d75a64637891ba46b51eb499beacfcba6)>)

### [0.2.1](https://github.com/redkubes/otomi-api/compare/v0.2.0...v0.2.1) (2020-04-14)

### Bug Fixes

- global prop mapping
  [ci skip](<[0d7867c](https://github.com/redkubes/otomi-api/commit/0d7867cb107d04cdad2d727f8bd50716b49db0b4)>)

## [0.2.0](https://github.com/redkubes/otomi-api/compare/v0.1.23...v0.2.0) (2020-04-14)

### ⚠ BREAKING CHANGES

- new apiDocs for services

### Bug Fixes

- disabling tests for now
  [ci skip](<[dff27ec](https://github.com/redkubes/otomi-api/commit/dff27ec2513a4bfb7847f56a503529ec080bbf4a)>)
- made api work with values structure, needs test fix
  [ci skip](<[8f21f9d](https://github.com/redkubes/otomi-api/commit/8f21f9d25ac7de9958ff834f2eb2980d98f77936)>)

### [0.1.23](https://github.com/redkubes/otomi-api/compare/v0.1.22...v0.1.23) (2020-04-09)

### Features

- add x-acl for role authorization
  ([d35744c](https://github.com/redkubes/otomi-api/commit/d35744ce570a45dc74cfa7ffffd068302312c1b4))

### Bug Fixes

- change spec and ingress properties title in api
  ([82b23c4](https://github.com/redkubes/otomi-api/commit/82b23c458244356575bf2550e24a804f61b78eb0))
- corrected run-if-changed package
  [ci skip](<[324a057](https://github.com/redkubes/otomi-api/commit/324a05707f027a21ab0fe0cc926490733029f96f)>)
- delete team ([3a6ecc0](https://github.com/redkubes/otomi-api/commit/3a6ecc04b4eb39989f66870fc4814d1e0a0527ae))
- dump and load values
  ([9ff523c](https://github.com/redkubes/otomi-api/commit/9ff523c5224bdc8c797545347d9be08c9c099312))
- fixed husky hooks
  [ci skip](<[40e1ab0](https://github.com/redkubes/otomi-api/commit/40e1ab0addd98c5f985c54e3843988f576fc5efc)>)
- lint-staged now without git add
  [ci skip](<[fca4cbf](https://github.com/redkubes/otomi-api/commit/fca4cbff1b9d34c4c0a4c63c766fa118181e7528)>)
- make autoCD optional
  ([f8588e4](https://github.com/redkubes/otomi-api/commit/f8588e41a5ee99f9e4732086b3decead82accac7))
- make glob and semver mutually exclusive
  ([67b88eb](https://github.com/redkubes/otomi-api/commit/67b88eb8763ac61829d7d1b86dd82cd8ac09d88d))
- make oneOff field nullable
  ([a1aaf07](https://github.com/redkubes/otomi-api/commit/a1aaf07fa733d156cc7683394f9845d2d60aa0fb))
- make oneOffiled nullable
  ([825a320](https://github.com/redkubes/otomi-api/commit/825a320e726b3089ab69935d40f1a0c9b2e4c554))

### CI

- added skip filter for
  [ci skip](<[e580178](https://github.com/redkubes/otomi-api/commit/e5801782d2041b4c6603190ec20c73c3e8f84eae)>)

### Styling

- otomi-stack ([1fca291](https://github.com/redkubes/otomi-api/commit/1fca291626baabb41bd094cd26bec6f0c1e214cd))

### Others

- add configuration for debugging tests
  ([84b6384](https://github.com/redkubes/otomi-api/commit/84b6384fbf52f5968aac44b4b33e96ae4fed3a6a))

### Code Refactoring

- provide meaningful name for ACL
  ([13f790a](https://github.com/redkubes/otomi-api/commit/13f790a85f8e7fda8643758f327119c6dc9c2e62))
- style change enforced by husky and prettier
  ([81d86e8](https://github.com/redkubes/otomi-api/commit/81d86e84ab7c608d23eb593a63c9d0dab9266109))

### 0.1.22 (2020-03-25)

### Features

- adding husky hook to force git commit to use cz
  [ci skip](<[83ffbb2](https://github.com/redkubes/otomi-api/commit/83ffbb2a8fd8246de3af772151527a27d394b021)>)
- automated release versioning
  ([20c6993](https://github.com/redkubes/otomi-api/commit/20c6993fc154d04f6b08ab205c1e33c091a6200a))

### Bug Fixes

- Added missing schemas
  ([49cb4f0](https://github.com/redkubes/otomi-api/commit/49cb4f0cf464633266ed8bf322026abcfe836cf2))
- corrected package version
  ([20e7c29](https://github.com/redkubes/otomi-api/commit/20e7c292f44d754b6c54c7a22302333542cfc4e2))
- delete service
  ([4f609cf](https://github.com/redkubes/otomi-api/commit/4f609cfb6acd9a7a0cb11ae1dd2ef43e7a6fdf1f))
