import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/src/stubs/uuid.ts',
  },
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!(@kubernetes/client-node|openid-client|oauth4webapi|jose)/)'],
  silent: false,
  verbose: true,
}
export default config
process.env = Object.assign(process.env, {
  NODE_ENV: 'test',
})
