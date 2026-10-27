import nock from 'nock'

// src/fixtures/jwt.ts registers a persisted nock interceptor on module load.
// nock patches Node's global http/https agent for the whole process, so without
// cleanup each test file's import re-registers on top of the last file's scopes.
// Across files sharing a Jest worker, those stacked interceptors race with real
// supertest requests to the local test server (socket hang up, random 401/404).
afterAll(() => {
  nock.cleanAll()
})

// nock v14's socket-level interceptor occasionally mishandles unrelated local
// supertest sockets under load (observed as random "socket hang up" / timeouts
// in the api(.v2).authz suites). Retry instead of fighting a 3rd-party flake.
jest.retryTimes(2)
