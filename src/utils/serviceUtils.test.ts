describe('assertServiceNameNotReserved', () => {
  const previous = process.env.RESERVED_SERVICE_NAMES

  afterEach(() => {
    if (previous === undefined) delete process.env.RESERVED_SERVICE_NAMES
    else process.env.RESERVED_SERVICE_NAMES = previous
  })

  it('rejects the default reserved names', () => {
    delete process.env.RESERVED_SERVICE_NAMES
    let assertServiceNameNotReserved: typeof import('./serviceUtils').assertServiceNameNotReserved
    jest.isolateModules(() => {
      ;({ assertServiceNameNotReserved } = require('./serviceUtils'))
    })

    expect(() => assertServiceNameNotReserved('grafana')).toThrow('reserved')
    expect(() => assertServiceNameNotReserved('my-service')).not.toThrow()
  })

  it('honours a custom RESERVED_SERVICE_NAMES value', () => {
    process.env.RESERVED_SERVICE_NAMES = 'custom-reserved'
    let assertServiceNameNotReserved: typeof import('./serviceUtils').assertServiceNameNotReserved
    jest.isolateModules(() => {
      ;({ assertServiceNameNotReserved } = require('./serviceUtils'))
    })

    expect(() => assertServiceNameNotReserved('custom-reserved')).toThrow('reserved')
    expect(() => assertServiceNameNotReserved('grafana')).not.toThrow()
  })

  it('disables the check when RESERVED_SERVICE_NAMES is empty', () => {
    process.env.RESERVED_SERVICE_NAMES = ''
    let assertServiceNameNotReserved: typeof import('./serviceUtils').assertServiceNameNotReserved
    jest.isolateModules(() => {
      ;({ assertServiceNameNotReserved } = require('./serviceUtils'))
    })

    expect(() => assertServiceNameNotReserved('grafana')).not.toThrow()
  })

  it('trims whitespace and ignores case', () => {
    let assertServiceNameNotReserved: typeof import('./serviceUtils').assertServiceNameNotReserved
    jest.isolateModules(() => {
      ;({ assertServiceNameNotReserved } = require('./serviceUtils'))
    })

    expect(() => assertServiceNameNotReserved(' Grafana ')).toThrow('reserved')
  })
})
