// workloadUtils.test.ts
import axios from 'axios'
import * as fsExtra from 'fs-extra'
import * as fsPromises from 'fs/promises'
import simpleGit from 'simple-git'
import YAML from 'yaml'
import {
  detectGitProvider,
  fetchChartYaml,
  fetchWorkloadCatalog,
  getGitCloneUrl,
  sparseCloneChart,
  updateChartIconInYaml,
  updateRbacForNewChart,
} from './workloadUtils'

jest.mock('axios')
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readdir: jest.fn(),
}))
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
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

// Save the original environment variables
const originalEnv = process.env

// ----------------------------------------------------------------
// Tests for detectGitProvider
describe('detectGitProvider', () => {
  test('returns null for undefined or non-string inputs', () => {
    expect(detectGitProvider(undefined)).toBeNull()
    expect(detectGitProvider(null)).toBeNull()
    expect(detectGitProvider(123 as any)).toBeNull()
  })

  test('detects GitHub URLs correctly', () => {
    const url = 'https://github.com/owner/repo/blob/main/path/to/file.yaml'
    const result = detectGitProvider(url)
    expect(result).toEqual({
      provider: 'github',
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      filePath: 'path/to/file.yaml',
    })
  })

  test('detects GitLab URLs correctly', () => {
    const url = 'https://gitlab.com/owner/charts/repo/-/blob/main/path/to/file.yaml'
    const result = detectGitProvider(url)
    expect(result).toEqual({
      provider: 'gitlab',
      owner: 'owner',
      repo: 'charts/repo',
      branch: 'main',
      filePath: 'path/to/file.yaml',
    })
  })

  test('detects Bitbucket URLs correctly', () => {
    const url = 'https://bitbucket.org/owner/repo/src/main/path/to/file.yaml'
    const result = detectGitProvider(url)
    expect(result).toEqual({
      provider: 'bitbucket',
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      filePath: 'path/to/file.yaml',
    })
  })

  test('returns null for unsupported URLs', () => {
    const url = 'https://example.com/owner/repo/main/file.yaml'
    expect(detectGitProvider(url)).toBeNull()
  })

  test('handles URLs with trailing slashes', () => {
    const url = 'https://github.com/owner/repo/blob/main/path/to/file.yaml/'
    const result = detectGitProvider(url)
    expect(result).toEqual({
      provider: 'github',
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      filePath: 'path/to/file.yaml',
    })
  })
})

// ----------------------------------------------------------------
// Tests for getGitCloneUrl
describe('getGitCloneUrl', () => {
  test('returns null for null input', () => {
    expect(getGitCloneUrl(null)).toBeNull()
  })

  test('returns GitHub clone URL', () => {
    const details = {
      provider: 'github',
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      filePath: 'path/to/Chart.yaml',
    }
    expect(getGitCloneUrl(details)).toBe('https://github.com/owner/repo.git')
  })

  test('returns GitLab clone URL', () => {
    const details = {
      provider: 'gitlab',
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      filePath: 'path/to/Chart.yaml',
    }
    expect(getGitCloneUrl(details)).toBe('https://gitlab.com/owner/repo.git')
  })

  test('returns Bitbucket clone URL', () => {
    const details = {
      provider: 'bitbucket',
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      filePath: 'path/to/Chart.yaml',
    }
    expect(getGitCloneUrl(details)).toBe('https://bitbucket.org/owner/repo.git')
  })

  test('returns null for unsupported provider', () => {
    const details = {
      provider: 'unsupported',
      owner: 'owner',
      repo: 'repo',
      branch: 'main',
      filePath: 'path/to/Chart.yaml',
    }
    expect(getGitCloneUrl(details)).toBeNull()
  })
})

// ----------------------------------------------------------------
// Tests for fetchChartYaml
describe('fetchChartYaml', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('successfully fetches and parses Chart.yaml', async () => {
    const url = 'https://github.com/owner/repo/blob/main/charts/mychart/Chart.yaml'
    const mockChartData = 'name: mychart\nversion: 1.0.0\ndescription: Test Chart'
    const expectedValues = { name: 'mychart', version: '1.0.0', description: 'Test Chart' }

    jest.spyOn(axios, 'get').mockResolvedValue({ data: mockChartData })

    const result = await fetchChartYaml(url)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(axios.get).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/owner/repo/main/charts/mychart/Chart.yaml',
      { responseType: 'text' },
    )
    expect(result).toEqual({ values: expectedValues, error: '' })
  })

  test('returns error for unsupported Git provider', async () => {
    const url = 'https://example.com/owner/repo/main/charts/mychart/Chart.yaml'

    const result = await fetchChartYaml(url)

    expect(result).toEqual({ values: {}, error: 'Unsupported Git provider or invalid URL format.' })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(axios.get).not.toHaveBeenCalled()
  })

  test('handles axios errors gracefully', async () => {
    const url = 'https://github.com/owner/repo/blob/main/charts/mychart/Chart.yaml'

    jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'))

    const result = await fetchChartYaml(url)

    expect(result).toEqual({ values: {}, error: 'Error fetching helm chart content.' })
  })
})

// ----------------------------------------------------------------
// Tests for updateChartIconInYaml
describe('updateChartIconInYaml', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('updates the icon field when newIcon is provided', async () => {
    const chartObject = { name: 'Test Chart', version: '1.0.0' }
    const fileContent = YAML.stringify(chartObject)
    ;(fsExtra.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakePath = '/tmp/test/Chart.yaml'
    const newIcon = 'https://example.com/new-icon.png'
    const expectedObject = { name: 'Test Chart', version: '1.0.0', icon: newIcon }
    const expectedContent = YAML.stringify(expectedObject)

    await updateChartIconInYaml(fakePath, newIcon)

    expect(fsExtra.readFile).toHaveBeenCalledWith(fakePath, 'utf-8')
    expect(fsPromises.writeFile).toHaveBeenCalledWith(fakePath, expectedContent, 'utf-8')
  })

  test('replaces existing icon when newIcon is provided', async () => {
    const chartObject = { name: 'Test Chart', version: '1.0.0', icon: 'https://example.com/old-icon.png' }
    const fileContent = YAML.stringify(chartObject)
    ;(fsExtra.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakePath = '/tmp/test/Chart.yaml'
    const newIcon = 'https://example.com/new-icon.png'
    const expectedObject = { name: 'Test Chart', version: '1.0.0', icon: newIcon }
    const expectedContent = YAML.stringify(expectedObject)

    await updateChartIconInYaml(fakePath, newIcon)

    expect(fsPromises.writeFile).toHaveBeenCalledWith(fakePath, expectedContent, 'utf-8')
  })

  test('does not change icon when newIcon is empty', async () => {
    const chartObject = { name: 'Test Chart', version: '1.0.0', icon: 'https://example.com/old-icon.png' }
    const fileContent = YAML.stringify(chartObject)
    ;(fsExtra.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakePath = '/tmp/test/Chart.yaml'
    const newIcon = ''

    await updateChartIconInYaml(fakePath, newIcon)

    // Verify writeFile was called, but the icon wasn't changed
    expect(fsPromises.writeFile).toHaveBeenCalled()
    const writeFileArgs = (fsPromises.writeFile as jest.Mock).mock.calls[0]
    const writtenContent = writeFileArgs[1]
    const parsedContent = YAML.parse(writtenContent)
    expect(parsedContent.icon).toBe('https://example.com/old-icon.png')
  })

  test('handles errors gracefully', async () => {
    ;(fsExtra.readFile as jest.Mock).mockRejectedValue(new Error('File not found'))
    const fakePath = '/tmp/test/Chart.yaml'
    const newIcon = 'https://example.com/new-icon.png'

    // Should not throw
    await expect(updateChartIconInYaml(fakePath, newIcon)).resolves.not.toThrow()
    expect(fsPromises.writeFile).not.toHaveBeenCalled()
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
    ;(fsExtra.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakeSparsePath = '/tmp/test'
    const chartKey = 'quickstart-cassandra'

    await updateRbacForNewChart(fakeSparsePath, chartKey, true)

    const expected = { rbac: { [chartKey]: null }, betaCharts: [] }
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${fakeSparsePath}/rbac.yaml`, YAML.stringify(expected), 'utf-8')
  })

  test('updates rbac.yaml with new chart key when allowTeams is false', async () => {
    const rbacObject = { rbac: {}, betaCharts: [] }
    const fileContent = YAML.stringify(rbacObject)
    ;(fsExtra.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakeSparsePath = '/tmp/test'
    const chartKey = 'quickstart-cassandra'

    await updateRbacForNewChart(fakeSparsePath, chartKey, false)

    const expected = { rbac: { [chartKey]: [] }, betaCharts: [] }
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${fakeSparsePath}/rbac.yaml`, YAML.stringify(expected), 'utf-8')
  })

  test('creates rbac.yaml when it does not exist', async () => {
    ;(fsExtra.readFile as jest.Mock).mockRejectedValue(new Error('File not found'))
    const fakeSparsePath = '/tmp/test'
    const chartKey = 'quickstart-cassandra'

    await updateRbacForNewChart(fakeSparsePath, chartKey, true)

    const expected = { rbac: { [chartKey]: null }, betaCharts: [] }
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${fakeSparsePath}/rbac.yaml`, YAML.stringify(expected), 'utf-8')
  })

  test('preserves existing rbac entries when adding new chart', async () => {
    const rbacObject = { rbac: { 'existing-chart': ['team-1'] }, betaCharts: ['existing-chart'] }
    const fileContent = YAML.stringify(rbacObject)
    ;(fsExtra.readFile as jest.Mock).mockResolvedValue(fileContent)
    const fakeSparsePath = '/tmp/test'
    const chartKey = 'quickstart-cassandra'

    await updateRbacForNewChart(fakeSparsePath, chartKey, false)

    const expected = {
      rbac: {
        'existing-chart': ['team-1'],
        [chartKey]: [],
      },
      betaCharts: ['existing-chart'],
    }
    expect(fsPromises.writeFile).toHaveBeenCalledWith(`${fakeSparsePath}/rbac.yaml`, YAML.stringify(expected), 'utf-8')
  })
})

// ----------------------------------------------------------------
// Tests for sparseCloneChart
describe('sparseCloneChart', () => {
  const gitRepositoryUrl = 'https://github.com/bitnami/charts/blob/main/bitnami/cassandra/Chart.yaml'
  const localHelmChartsDir = '/tmp/otomi/charts/uuid'
  const helmChartCatalogUrl = 'https://gitea.example.com/otomi/charts.git'
  const user = 'test-user'
  const email = 'test@example.com'
  const chartTargetDirName = 'cassandra'
  const chartIcon = 'https://example.com/icon.png'
  const allowTeams = true

  beforeEach(() => {
    jest.clearAllMocks()
    // Set up environment variables for tests
    process.env = { ...originalEnv, GIT_USER: 'git-user', GIT_PASSWORD: 'git-password' }
    // Mock necessary function responses
    ;(fsExtra.existsSync as jest.Mock).mockReturnValue(false)
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  test('successfully clones and processes a chart repository', async () => {
    // Setup mock git instance
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
      cwd: jest.fn().mockResolvedValue(undefined),
      raw: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      addConfig: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      pull: jest.fn().mockResolvedValue(undefined),
      push: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

    const result = await sparseCloneChart(
      gitRepositoryUrl,
      localHelmChartsDir,
      helmChartCatalogUrl,
      user,
      email,
      chartTargetDirName,
      chartIcon,
      allowTeams,
    )

    expect(result).toBe(true)
    expect(fsExtra.mkdirSync).toHaveBeenCalledWith(localHelmChartsDir, { recursive: true })
    expect(fsExtra.mkdirSync).toHaveBeenCalledWith(`${localHelmChartsDir}-newChart`, { recursive: true })
    expect(mockGit.clone).toHaveBeenCalledTimes(2) // Once for catalog repo, once for chart repo
    expect(mockGit.raw).toHaveBeenCalledWith(['sparse-checkout', 'init', '--cone'])
    expect(mockGit.raw).toHaveBeenCalledWith(['sparse-checkout', 'set', 'bitnami/cassandra/'])
    expect(mockGit.checkout).toHaveBeenCalledWith('main')
    expect(fsExtra.renameSync).toHaveBeenCalled()
    expect(fsExtra.rmSync).toHaveBeenCalled()
    // Verify addConfig was called with correct user/email
    expect(mockGit.addConfig).toHaveBeenCalledWith('user.name', user)
    expect(mockGit.addConfig).toHaveBeenCalledWith('user.email', email)
    // Verify commit and push were called
    expect(mockGit.add).toHaveBeenCalledWith('.')
    expect(mockGit.commit).toHaveBeenCalledWith(`Add ${chartTargetDirName} helm chart`)
    expect(mockGit.pull).toHaveBeenCalledWith('origin', 'main', { '--rebase': null })
    expect(mockGit.push).toHaveBeenCalledWith('origin', 'main')
  })

  test('handles Gitea URLs by encoding credentials', async () => {
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
      cwd: jest.fn().mockResolvedValue(undefined),
      raw: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      addConfig: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      pull: jest.fn().mockResolvedValue(undefined),
      push: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

    await sparseCloneChart(
      gitRepositoryUrl,
      localHelmChartsDir,
      helmChartCatalogUrl,
      user,
      email,
      chartTargetDirName,
      chartIcon,
      allowTeams,
    )

    // Check that clone was called with encoded URL
    const encodedUrl = `https://git-user:git-password@gitea.example.com/otomi/charts.git`
    expect(mockGit.clone.mock.calls[0][0]).toBe(encodedUrl)
  })

  test('properly handles empty chartIcon parameter', async () => {
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
      cwd: jest.fn().mockResolvedValue(undefined),
      raw: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      addConfig: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      pull: jest.fn().mockResolvedValue(undefined),
      push: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

    const result = await sparseCloneChart(
      gitRepositoryUrl,
      localHelmChartsDir,
      helmChartCatalogUrl,
      user,
      email,
      chartTargetDirName,
      '', // Empty chart icon
      allowTeams,
    )

    expect(result).toBe(true)
    // Should not attempt to update the chart icon
    const chartYamlPath = `${localHelmChartsDir}/${chartTargetDirName}/Chart.yaml`
    expect(fsExtra.readFile).not.toHaveBeenCalledWith(chartYamlPath, 'utf-8')
  })

  test('creates directory if it does not exist', async () => {
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
      cwd: jest.fn().mockResolvedValue(undefined),
      raw: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      addConfig: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      pull: jest.fn().mockResolvedValue(undefined),
      push: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)
    ;(fsExtra.existsSync as jest.Mock).mockReturnValueOnce(false)

    await sparseCloneChart(
      gitRepositoryUrl,
      localHelmChartsDir,
      helmChartCatalogUrl,
      user,
      email,
      chartTargetDirName,
      chartIcon,
      allowTeams,
    )

    expect(fsExtra.mkdirSync).toHaveBeenCalledWith(localHelmChartsDir, { recursive: true })
  })
})

// ----------------------------------------------------------------
// Tests for fetchWorkloadCatalog
describe('fetchWorkloadCatalog', () => {
  const url = 'https://gitea.example.com/otomi/charts.git'
  const helmChartsDir = '/tmp/otomi/charts/uuid'

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, GIT_USER: 'git-user', GIT_PASSWORD: 'git-password' }
    ;(fsExtra.existsSync as jest.Mock).mockReturnValue(false)

    // Mock directory structure
    const files = ['.git', 'chart1', 'chart2', 'README.md', 'rbac.yaml']
    ;(fsPromises.readdir as jest.Mock).mockResolvedValue(files)

    // Mock rbac.yaml content
    const rbacContent = YAML.stringify({
      rbac: {
        chart1: null,
        chart2: ['team-2'],
      },
      betaCharts: ['chart2'],
    })
    ;(fsExtra.readFile as jest.Mock).mockImplementation((path) => {
      if (path.endsWith('rbac.yaml')) return Promise.resolve(rbacContent)

      if (path.endsWith('chart1/README.md')) return Promise.resolve('# Chart 1 README')

      if (path.endsWith('chart1/values.yaml')) return Promise.resolve('key: value')

      if (path.endsWith('chart1/Chart.yaml')) {
        return Promise.resolve(
          YAML.stringify({
            name: 'chart1',
            version: '1.0.0',
            description: 'Test Chart 1',
            icon: 'https://example.com/icon1.png',
          }),
        )
      }
      if (path.endsWith('chart2/README.md')) return Promise.resolve('# Chart 2 README')

      if (path.endsWith('chart2/values.yaml')) return Promise.resolve('key: value')

      if (path.endsWith('chart2/Chart.yaml')) {
        return Promise.resolve(
          YAML.stringify({
            name: 'chart2',
            version: '2.0.0',
            description: 'Test Chart 2',
            icon: 'https://example.com/icon2.png',
          }),
        )
      }
      return Promise.reject(new Error(`File not found: ${path}`))
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test('clones repository and builds catalog for admin team', async () => {
    // Setup mock git instance
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

    const result = await fetchWorkloadCatalog(url, helmChartsDir, 'admin')

    expect(fsExtra.mkdirSync).toHaveBeenCalledWith(helmChartsDir, { recursive: true })
    expect(mockGit.clone).toHaveBeenCalledWith(
      'https://git-user:git-password@gitea.example.com/otomi/charts.git',
      helmChartsDir,
    )
    expect(result).toEqual({
      helmCharts: ['chart1', 'chart2'],
      catalog: [
        {
          name: 'chart1',
          values: 'key: value',
          icon: 'https://example.com/icon1.png',
          chartVersion: '1.0.0',
          chartDescription: 'Test Chart 1',
          readme: '# Chart 1 README',
          isBeta: false,
        },
        {
          name: 'chart2',
          values: 'key: value',
          icon: 'https://example.com/icon2.png',
          chartVersion: '2.0.0',
          chartDescription: 'Test Chart 2',
          readme: '# Chart 2 README',
          isBeta: true,
        },
      ],
    })
  })

  test('filters catalog based on team permissions', async () => {
    // Setup mock git instance
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

    const result = await fetchWorkloadCatalog(url, helmChartsDir, '1')

    // Only chart1 should be accessible to team-1
    expect(result).toEqual({
      helmCharts: ['chart1'],
      catalog: [
        {
          name: 'chart1',
          values: 'key: value',
          icon: 'https://example.com/icon1.png',
          chartVersion: '1.0.0',
          chartDescription: 'Test Chart 1',
          readme: '# Chart 1 README',
          isBeta: false,
        },
      ],
    })
  })

  test('handles non-existent README files', async () => {
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

    // Make the README.md file read fail
    ;(fsExtra.readFile as jest.Mock).mockImplementation((path) => {
      if (path.endsWith('chart1/README.md')) return Promise.reject(new Error('File not found'))

      if (path.endsWith('chart1/values.yaml')) return Promise.resolve('key: value')

      if (path.endsWith('chart1/Chart.yaml')) {
        return Promise.resolve(
          YAML.stringify({
            name: 'chart1',
            version: '1.0.0',
            description: 'Test Chart 1',
            icon: 'https://example.com/icon1.png',
          }),
        )
      }
      if (path.endsWith('rbac.yaml')) {
        return Promise.resolve(
          YAML.stringify({
            rbac: { chart1: null },
            betaCharts: [],
          }),
        )
      }
      return Promise.reject(new Error(`File not found: ${path}`))
    })

    const result = await fetchWorkloadCatalog(url, helmChartsDir, 'admin')

    // Should include chart1 with default README message
    expect(result.catalog[0].readme).toBe('There is no `README` for this chart.')
  })

  test('handles missing rbac.yaml file', async () => {
    const mockGit = {
      clone: jest.fn().mockResolvedValue(undefined),
    }
    ;(simpleGit as jest.Mock).mockReturnValue(mockGit)

    // Make the rbac.yaml file read fail
    ;(fsExtra.readFile as jest.Mock).mockImplementation((path) => {
      if (path.endsWith('rbac.yaml')) return Promise.reject(new Error('File not found'))

      if (path.endsWith('chart1/README.md')) return Promise.resolve('# Chart 1 README')

      if (path.endsWith('chart1/values.yaml')) return Promise.resolve('key: value')

      if (path.endsWith('chart1/Chart.yaml')) {
        return Promise.resolve(
          YAML.stringify({
            name: 'chart1',
            version: '1.0.0',
            description: 'Test Chart 1',
            icon: 'https://example.com/icon1.png',
          }),
        )
      }
      return Promise.reject(new Error(`File not found: ${path}`))
    })

    const result = await fetchWorkloadCatalog(url, helmChartsDir, 'admin')

    // Should include charts in the catalog
    expect(result.helmCharts).toEqual(['chart1'])
    expect(result.catalog).toHaveLength(1)
  })
})
