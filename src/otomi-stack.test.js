const expect = require('chai').expect;
const otomi = require('./otomi-stack')
const yaml = require('js-yaml');
const fs = require('fs');
const db = require('./db');


describe("Load and dump values", function () {
  let otomiStack = undefined
  beforeEach(function () {
    const d = db.init()
    otomiStack = new otomi.OtomiStack(null, d)
  })

  it("should convert db to values structure", function (done) {
    otomiStack.createTeam({ teamId: 'team1' }, { name: 'team1', cicd: { enabled: true, type: 'drone' }, password: 'somepassworddd' })
    otomiStack.createService({ teamId: 'team1', serviceId: 'hello' }, {
      image: { repository: 'otomi/helloworld-nodejs', tag: '1.1.3' },
      isPublic: true,
      logo: { name: 'kubernetes' },
      name: 'hello',
      serviceType: {ksvc: 'ksvc_data', svc: 'svc_data'}
    })
    const values = otomiStack.convertDbToValues()
    const expectedValues = yaml.safeLoad(fs.readFileSync('./test/team.yaml', 'utf8'));
    expect(values).to.deep.equal(expectedValues)
    done()
  });

  it("should load values to db", function (done) {

    otomiStack.convertValuesToDb(yaml.safeLoad(fs.readFileSync('./test/team.yaml', 'utf8')))
    const expectedTeam = {
      teamId: 'team1',
      name: 'team1',
      cicd: {
        enabled: true,
        type: 'drone'
      },
      password: 'somepassworddd',
    }

    const expectedService = {
      teamId: 'team1',
      serviceId: 'hello',

      image: {
        repository: 'otomi/helloworld-nodejs',
        tag: '1.1.3'
      },
      isPublic: true,
      logo: { name: 'kubernetes' },
      name: 'hello',
      serviceType: {ksvc: 'ksvc_data', svc: 'svc_data'}
    }

    let data = otomiStack.getTeam({ teamId: 'team1' })
    expect(data).to.deep.equal(expectedTeam)

    data = otomiStack.getService({ teamId: 'team1', serviceId: 'hello' })
    expect(data).to.deep.equal(expectedService)
    done()
  });
});
