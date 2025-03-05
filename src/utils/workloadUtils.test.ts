// workloadUtils.test.ts
import Debug from 'debug'
import YAML from 'yaml'
import { updateChartIconInYaml, updateRbacForNewChart } from './workloadUtils'

import * as fsPromises from 'fs/promises'

const debug = Debug('otomi:api:workloadCatalog')

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
}))
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  renameSync: jest.fn(),
  rmSync: jest.fn(),
}))
jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    clone: jest.fn().mockResolvedValue(undefined),
    cwd: jest.fn().mockResolvedValue(undefined),
    raw: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
    addConfig: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    pull: jest.fn().mockResolvedValue(undefined),
    push: jest.fn().mockResolvedValue(undefined),
  })),
}))
// // --- Mocks for simple-git ---
// // We'll create our own mock implementation so that we can track calls.
// const mockClone = jest.fn().mockResolvedValue(undefined)
// const mockCwd = jest.fn().mockResolvedValue(undefined)
// const mockRaw = jest.fn().mockResolvedValue(undefined)
// const mockCheckout = jest.fn().mockResolvedValue(undefined)
// const mockAddConfig = jest.fn().mockResolvedValue(undefined)
// const mockAdd = jest.fn().mockResolvedValue(undefined)
// const mockCommit = jest.fn().mockResolvedValue(undefined)
// const mockPull = jest.fn().mockResolvedValue(undefined)
// const mockPush = jest.fn().mockResolvedValue(undefined)

// const mockSimpleGit = jest.fn(() => ({
//   clone: mockClone,
//   cwd: mockCwd,
//   raw: mockRaw,
//   checkout: mockCheckout,
//   addConfig: mockAddConfig,
//   add: mockAdd,
//   commit: mockCommit,
//   pull: mockPull,
//   push: mockPush,
// }))

// jest.mock('simple-git', () => mockSimpleGit)

// ----------------------------------------------------------------
// Tests for updateChartIconInYaml
describe('updateChartIconInYaml', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('updates the icon field when newIcon is provided', async () => {
    const chartObject = { name: 'Test Chart', icon: '' }
    const fileContent = YAML.stringify(chartObject)
    ;(fsPromises.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakePath = '/tmp/test/Chart.yaml'
    const newIcon = 'https://example.com/new-icon.png'
    const expectedObject = { name: 'Test Chart', icon: newIcon }
    const expectedContent = YAML.stringify(expectedObject)
    jest.spyOn(fsPromises, 'readFile').mockResolvedValue(fileContent)
    await updateChartIconInYaml(fakePath, newIcon)

    expect(fsPromises.readFile).toHaveBeenCalledWith(fakePath, 'utf-8')
    expect(fsPromises.writeFile).toHaveBeenCalledWith(fakePath, expectedContent, 'utf-8')
  })
})

// ----------------------------------------------------------------
// Tests for updateRbacForNewChart
describe('updateRbacForNewChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('updates rbac.yaml with new chart key when allowTeams is true', async () => {
    const rbacObject = { rbac: {}, betaCharts: [] }
    const fileContent = YAML.stringify(rbacObject)
    ;(fsPromises.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakeSparsePath = '/tmp/test'
    const chartKey = 'quickstart-cassandra'

    await updateRbacForNewChart(fakeSparsePath, chartKey, true)

    const expected = { rbac: { [chartKey]: null }, betaCharts: [] }
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${fakeSparsePath}/rbac.yaml`, YAML.stringify(expected), 'utf-8')
  })

  test('updates rbac.yaml with new chart key when allowTeams is false', async () => {
    const rbacObject = { rbac: {}, betaCharts: [] }
    const fileContent = YAML.stringify(rbacObject)
    ;(fsPromises.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakeSparsePath = '/tmp/test'
    const chartKey = 'quickstart-cassandra'

    await updateRbacForNewChart(fakeSparsePath, chartKey, false)

    const expected = { rbac: { [chartKey]: [] }, betaCharts: [] }
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${fakeSparsePath}/rbac.yaml`, YAML.stringify(expected), 'utf-8')
  })
})

// // ----------------------------------------------------------------
// // Tests for sparseCloneChart
// describe('sparseCloneChart', () => {
//   const fakeSparsePath = '/tmp/test'
//   const fakeHelmCatalogUrl = 'https://gitea.example.com/otomi/charts.git'
//   const fakeUser = 'TestUser'
//   const fakeEmail = 'test@example.com'
//   const fakeChartName = 'cassandra'
//   const fakeChartPath = 'bitnami/cassandra'
//   const fakeRevision = 'main'
//   const fakeChartIcon = 'https://example.com/icon.png'

//   beforeEach(() => {
//     jest.clearAllMocks()
//     ;(existsSync as jest.Mock)
//       .mockReturnValue(true)(
//         // Ensure mkdirSync, rmSync, renameSync are defined.
//         mkdirSync as jest.Mock,
//       )
//       .mockImplementation(() => {})(rmSync as jest.Mock)
//       .mockImplementation(() => {})(renameSync as jest.Mock)
//       .mockImplementation(() => {})
//   })

//   test('sparseCloneChart returns true on successful clone and push', async () => {
//     // Arrange: simulate a successful run
//     // (Mocks for simpleGit methods are already set to resolved values.)
//     const result = await sparseCloneChart(
//       'https://github.com/bitnami/charts.git',
//       fakeHelmCatalogUrl,
//       fakeUser,
//       fakeEmail,
//       fakeChartName,
//       fakeChartPath,
//       fakeSparsePath,
//       fakeRevision,
//       fakeChartIcon,
//       true,
//     )

//     expect(result).toBe(true)
//     // Assert that renameSync was called to move the chart folder.
//     expect(renameSync).toHaveBeenCalled()
//     // And that the simpleGit clone and push methods were called.
//     expect(mockClone).toHaveBeenCalled()
//     expect(mockPush).toHaveBeenCalled()
//   })

//   test('sparseCloneChart returns false when an error occurs', async () => {
//     // Arrange: simulate an error in the cloning process.
//     mockClone.mockRejectedValueOnce(new Error('Clone failed'))

//     let result: boolean | undefined
//     try {
//       result = await sparseCloneChart(
//         'https://github.com/bitnami/charts.git',
//         fakeHelmCatalogUrl,
//         fakeUser,
//         fakeEmail,
//         fakeChartName,
//         fakeChartPath,
//         fakeSparsePath,
//         fakeRevision,
//         fakeChartIcon,
//         true,
//       )
//     } catch (error) {
//       result = false
//     }
//     expect(result).toBe(false)
//   })
// })
