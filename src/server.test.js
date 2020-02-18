const expect = require('chai').expect;
const server = require('./server')


describe("Cluster api spec", function () {
  beforeEach(function () {

  })

  it("should convert db clouds to api spec", function (done) {
    const spec = server.getClustersSpec([
      {name: 'aws', clusters: ['A', 'B', 'C']}, 
      {name: 'google', clusters: ['E', 'F']}
    ])

    const expected_spec = {
      aws: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['A', 'B', 'C']
        },
        uniqueItems: true
      },
      google: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['E', 'F']
        },
        uniqueItems: true
      }
    }
    expect(spec).to.deep.equal(expected_spec)
    done()
  });

});
