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
    let scanChainMock;
    let vogelsMock;

    before(() => {
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: false
        });
    });

    beforeEach(() => {
        responseMock = {
            toJSON: sinon.stub(),
            Items: []
        };
        scanChainMock = {
            limit: sinon.stub(),
            exec: sinon.stub()
        };
        pipelinesClientMock = {
            create: sinon.stub(),
            get: sinon.stub(),
            scan: sinon.stub().returns(scanChainMock),
            update: sinon.stub()
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

        it('constructs the client with defined credentials', () => {
            datastore = new Datastore({
                accessKeyId: 'foo',
                secretAccessKey: 'bar'
            });

            assert.calledWith(vogelsMock.AWS.config.update, {
                region: 'us-west-2',
                accessKeyId: 'foo',
                secretAccessKey: 'bar'
            });
        });
    });

    describe('get', () => {
        it('gets data by id', (done) => {
            const testParams = {
                table: 'pipelines',
                params: {
                    id: 'someId'
                }
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
                assert.calledWith(pipelinesClientMock.get, testParams.params.id);
                done();
            });
        });

        it('gracefully understands that no one is returned when it does not exist', (done) => {
            pipelinesClientMock.get.yieldsAsync();

            datastore.get({
                table: 'pipelines',
                params: {
                    id: 'someId'
                }
            }, (err, data) => {
                assert.isNotOk(err);
                assert.isNotOk(data);
                done();
            });
        });

        it('fails when given an unknown table name', (done) => {
            datastore.get({
                table: 'tableUnicorn',
                params: {
                    id: 'doesNotMatter'
                }
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
                params: {
                    id: 'someId'
                }
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

    describe('update', () => {
        it('updates the data in the datastore', (done) => {
            const clientReponse = {
                toJSON: sinon.stub()
            };
            const id = 'someId';
            const expectedResult = {
                id,
                targetKey: 'updatedValue',
                otherKey: 'becauseTestsCheat'
            };

            pipelinesClientMock.update.yieldsAsync(null, clientReponse);
            clientReponse.toJSON.returns(expectedResult);

            datastore.update({
                table: 'pipelines',
                params: {
                    id,
                    data: { targetKey: 'updatedValue' }
                }
            }, (err, data) => {
                assert.isNotOk(err);
                assert.deepEqual(data, expectedResult);
                assert.calledWith(pipelinesClientMock.update, {
                    id,
                    targetKey: 'updatedValue'
                });
                done();
            });
        });

        /*
        When using the 'expected' option, the error will look like this when it fails:
        { [ConditionalCheckFailedException: The conditional request failed]
          message: 'The conditional request failed',
          code: 'ConditionalCheckFailedException',
          time: Thu Jul 21 2016 16:56:35 GMT-0700 (PDT),
          requestId: '<redacted>',
          statusCode: 400,
          retryable: false,
          retryDelay: 0 }
         */
        it('returns null when item does not exist in datastore', (done) => {
            const id = 'someId';
            const testError = new Error('The conditional request failed');

            testError.statusCode = 400;
            pipelinesClientMock.update.yieldsAsync(testError);

            datastore.update({
                table: 'pipelines',
                params: {
                    id,
                    data: {
                        otherKey: 'value'
                    }
                }
            }, (err, data) => {
                assert.isNull(data);
                assert.calledWith(pipelinesClientMock.update, {
                    id,
                    otherKey: 'value'
                }, {
                    expected: {
                        id
                    }
                });
                done();
            });
        });

        it('returns nothing when given an unknown table name', (done) => {
            datastore.update({
                table: 'doesNotExist',
                params: {
                    id: 'doesNotMatter',
                    data: {}
                }
            }, (err, data) => {
                assert.isNull(err);
                assert.isNull(data);
                done();
            });
        });

        it('fails when it encounters an error', (done) => {
            const testError = new Error('testError');

            pipelinesClientMock.update.yieldsAsync(testError);
            datastore.update({
                table: 'pipelines',
                params: {
                    id: 'doesNotMatter',
                    data: {}
                }
            }, (err) => {
                assert.strictEqual(testError.message, err.message);
                done();
            });
        });
    });

    describe('scan', () => {
        const testParams = {
            table: 'pipelines',
            params: {},
            paginate: {
                count: 2,
                page: 2
            }
        };
        let count;
        const dynamoItem = { toJSON: sinon.stub() };

        beforeEach(() => {
            count = testParams.paginate.count * testParams.paginate.page;
        });

        it('scans all the data', (done) => {
            const testData = [
                {
                    id: 'data',
                    key: 'value'
                },
                {
                    id: 'data',
                    key: 'value'
                }
            ];

            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);

            for (; count > 0; count--) {
                responseMock.Items[count - 1] = dynamoItem;
            }

            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });
            datastore.scan(testParams, (err, data) => {
                assert.isNull(err);
                assert.deepEqual(testData, data);
                assert.calledWith(pipelinesClientMock.scan);
                done();
            });
        });

        it('returns empty array when no keys found', (done) => {
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);

            responseMock.Items[0] = dynamoItem;

            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });

            datastore.scan(testParams, (err, data) => {
                assert.isNull(err);
                assert.deepEqual([], data);
                assert.calledWith(pipelinesClientMock.scan);
                done();
            });
        });

        it('fails when given an unknown table name', (done) => {
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(new Error('cannot find entries in table'));

            datastore.scan({
                table: 'tableUnicorn',
                params: {},
                paginate: {
                    count: 2,
                    page: 2
                }
            }, (err, data) => {
                assert.match(err.message, /Invalid table name/);
                assert.isNotOk(data);
                done();
            });
        });

        it('fails when it encounters an error', (done) => {
            const testError = new Error('errorCommunicatingToApi');

            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(testError);

            datastore.scan({
                table: 'pipelines',
                params: {},
                paginate: {
                    count: 2,
                    page: 2
                }
            }, (err, data) => {
                assert.strictEqual(testError.message, err.message);
                assert.isNotOk(data);
                done();
            });
        });
    });
});
