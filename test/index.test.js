'use strict';
const assert = require('chai').assert;
const mockery = require('mockery');
const sinon = require('sinon');

sinon.assert.expose(assert, { prefix: '' });

describe('index test', () => {
    let Datastore;
    let schemaMock;
    let vogelsMock;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        schemaMock = {
            tableName: {
                base: sinon.stub()
            }
        };
        mockery.registerMock('screwdriver-data-schema', schemaMock);

        vogelsMock = {
            AWS: {
                config: {
                    update: sinon.stub()
                }
            },
            define: sinon.stub(),
            types: {
                uuid: sinon.stub()
            }
        };
        mockery.registerMock('vogels', vogelsMock);

        /* eslint-disable global-require */
        Datastore = require('../index');
        /* eslint-enable global-require */
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    after(() => {
        mockery.disable();
    });

    it('constructs the client correctly', () => {
        const datastore = new Datastore({ tableName: 'tableName' });

        assert.isOk(datastore);
        assert.calledWith(vogelsMock.define, 'tableName', {
            hashKey: 'id',
            schema: schemaMock.tableName.base
        });
        assert.calledWith(vogelsMock.AWS.config.update, {
            region: 'us-west-2'
        });
    });

    it('constructs the client with a defined region', () => {
        const datastore = new Datastore({
            tableName: 'tableName',
            region: 'my-region'
        });

        assert.isOk(datastore);
        assert.calledWith(vogelsMock.AWS.config.update, {
            region: 'my-region'
        });
    });
});
