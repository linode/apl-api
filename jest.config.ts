import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/src/stubs/uuid.ts',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@kubernetes/client-node|@apidevtools/json-schema-ref-parser|openid-client|oauth4webapi|jose)/)',
  ],
  silent: false,
  verbose: true,
  maxWorkers: '50%',
}
export default config
process.env = Object.assign(process.env, {
  NODE_ENV: 'test',
})
