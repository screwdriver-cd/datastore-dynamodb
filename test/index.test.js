'use strict';
const assert = require('chai').assert;
const mockery = require('mockery');
const sinon = require('sinon');

sinon.assert.expose(assert, { prefix: '' });

describe('index test', () => {
    let datastore;
    let Datastore;
    let pipelinesClientMock;
    let responseMock;
    let dataSchemaMock;
    let vogelsMock;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        responseMock = {
            toJSON: sinon.stub()
        };
        pipelinesClientMock = {
            create: sinon.stub(),
            get: sinon.stub()
        };

        dataSchemaMock = {
            build: { base: sinon.stub() },
            job: { base: sinon.stub() },
            pipeline: { base: sinon.stub() },
            platform: { base: sinon.stub() },
            user: { base: sinon.stub() }
        };
        mockery.registerMock('screwdriver-data-schema', dataSchemaMock);

        vogelsMock = {
            AWS: {
                config: {
                    update: sinon.stub()
                }
            },
            // warning: only pipelines stub is assert for the purpose of unit tests
            define: sinon.stub().withArgs('pipelines').returns(pipelinesClientMock)
        };
        mockery.registerMock('vogels', vogelsMock);

        /* eslint-disable global-require */
        Datastore = require('../index');
        /* eslint-enable global-require */
        datastore = new Datastore();
    });

    afterEach(() => {
        mockery.deregisterAll();
        mockery.resetCache();
    });

    after(() => {
        mockery.disable();
    });

    describe('constructor', () => {
        let clientMock;

        beforeEach(() => {
            clientMock = {
                get: sinon.stub()
            };

            vogelsMock.define = sinon.stub().returns(clientMock);

            datastore = new Datastore();
        });

        it('constructs the client with the default region', () => {
            assert.calledWith(vogelsMock.AWS.config.update, {
                region: 'us-west-2'
            });
        });

        it('constructs the builds client', () => {
            assert.calledWith(vogelsMock.define, 'builds', {
                hashKey: 'id',
                schema: dataSchemaMock.build.base,
                tableName: 'builds'
            });
        });

        it('constructs the jobs client', () => {
            assert.calledWith(vogelsMock.define, 'jobs', {
                hashKey: 'id',
                schema: dataSchemaMock.job.base,
                tableName: 'jobs'
            });
        });

        it('constructs the pipelines client', () => {
            assert.calledWith(vogelsMock.define, 'pipelines', {
                hashKey: 'id',
                schema: dataSchemaMock.pipeline.base,
                tableName: 'pipelines'
            });
        });

        it('constructs the platforms client', () => {
            assert.calledWith(vogelsMock.define, 'platforms', {
                hashKey: 'id',
                schema: dataSchemaMock.platform.base,
                tableName: 'platforms'
            });
        });

        it('constructs the users client', () => {
            assert.calledWith(vogelsMock.define, 'users', {
                hashKey: 'id',
                schema: dataSchemaMock.user.base,
                tableName: 'users'
            });
        });

        it('constructs the client with a defined region', () => {
            datastore = new Datastore({
                region: 'my-region'
            });

            assert.calledWith(vogelsMock.AWS.config.update, {
                region: 'my-region'
            });
        });
    });

    describe('get', () => {
        it('gets data by id', (done) => {
            const testParams = {
                table: 'pipelines',
                id: 'someId'
            };
            const testData = {
                id: 'data',
                key: 'value'
            };

            pipelinesClientMock.get.yieldsAsync(null, responseMock);
            responseMock.toJSON.returns(testData);

            datastore.get(testParams, (err, data) => {
                assert.isNull(err);
                assert.deepEqual(testData, data);
                assert.calledWith(pipelinesClientMock.get, testParams.id);
                done();
            });
        });

        it('gracefully understands that no one is returned when it does not exist', (done) => {
            pipelinesClientMock.get.yieldsAsync();

            datastore.get({
                table: 'pipelines',
                id: 'someId'
            }, (err, data) => {
                assert.isNotOk(err);
                assert.isNotOk(data);
                done();
            });
        });

        it('fails when given an unknown table name', (done) => {
            datastore.get({
                table: 'tableUnicorn',
                id: 'doesNotMatter'
            }, (err, data) => {
                assert.match(err.message, /Invalid table name/);
                assert.isNotOk(data);
                done();
            });
        });

        it('fails when it encounters an error', (done) => {
            const testError = new Error('errorCommunicatingToApi');

            pipelinesClientMock.get.yieldsAsync(testError);
            datastore.get({
                table: 'pipelines',
                id: 'someId'
            }, (err, data) => {
                assert.strictEqual(testError.message, err.message);
                assert.isNotOk(data);
                done();
            });
        });
    });

    describe('save', () => {
        it('saves the data', (done) => {
            const clientResponse = {
                toJSON: sinon.stub()
            };
            const expectedResult = {
                id: 'someIdToPutHere',
                key: 'value',
                addedData: 'becauseTestsCheat'
            };

            clientResponse.toJSON.returns(expectedResult);
            pipelinesClientMock.create.yieldsAsync(null, clientResponse);

            datastore.save({
                table: 'pipelines',
                params: {
                    id: 'someIdToPutHere',
                    data: { key: 'value' }
                }
            }, (err, data) => {
                assert.isNotOk(err);
                assert.deepEqual(expectedResult, data);
                assert.calledWith(pipelinesClientMock.create, {
                    id: 'someIdToPutHere',
                    key: 'value'
                });
                done();
            });
        });

        it('fails when it encounters an error', (done) => {
            const testError = new Error('testError');

            pipelinesClientMock.create.yieldsAsync(testError);
            datastore.save({
                table: 'pipelines',
                params: {
                    id: 'doesNotMatter',
                    data: {}
                }
            }, (err) => {
                assert.isOk(err);
                done();
            });
        });

        it('fails when given an unknown table name', (done) => {
            datastore.save({
                table: 'doesNotExist',
                params: {
                    id: 'doesNotMatter',
                    data: {}
                }
            }, (err, data) => {
                assert.match(err.message, /Invalid table name/);
                assert.isNotOk(data);
                done();
            });
        });
    });
});
