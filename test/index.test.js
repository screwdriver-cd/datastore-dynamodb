/* eslint-disable no-underscore-dangle */
'use strict';
const assert = require('chai').assert;
const mockery = require('mockery');
const sinon = require('sinon');

sinon.assert.expose(assert, { prefix: '' });

describe('index test', () => {
    let datastore;
    let Datastore;
    let clientMock;
    let responseMock;
    let dataSchemaMock;
    let scanChainMock;
    let queryChainMock;
    let bobbyMock;
    let BobbyMockFactory;

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
            ascending: sinon.stub(),
            descending: sinon.stub(),
            limit: sinon.stub(),
            exec: sinon.stub()
        };
        queryChainMock = {
            usingIndex: sinon.stub().returns(scanChainMock)
        };
        clientMock = {
            create: sinon.stub(),
            get: sinon.stub(),
            scan: sinon.stub().returns(scanChainMock),
            query: sinon.stub().returns(queryChainMock),
            update: sinon.stub()
        };

        dataSchemaMock = {
            models: {
                pipeline: {
                    base: sinon.stub(),
                    indexes: ['foo'],
                    tableName: 'pipelines'
                },
                job: {
                    base: sinon.stub(),
                    tableName: 'jobs'
                },
                build: {
                    base: sinon.stub(),
                    tableName: 'builds'
                },
                user: {
                    base: sinon.stub(),
                    tableName: 'users'
                }
            },
            plugins: {
                datastore: {
                    get: sinon.stub(),
                    update: sinon.stub(),
                    remove: sinon.stub(),
                    save: sinon.stub(),
                    scan: sinon.stub()
                }
            }
        };
        mockery.registerMock('screwdriver-data-schema', dataSchemaMock);

        bobbyMock = {
            defineTable: sinon.stub().returns(clientMock)
        };
        BobbyMockFactory = sinon.stub();
        BobbyMockFactory.prototype.defineTable = bobbyMock.defineTable;
        mockery.registerMock('screwdriver-dynamic-dynamodb', BobbyMockFactory);

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
        beforeEach(() => {
            datastore = new Datastore();
        });

        it('constructs with the default region', () => {
            assert.calledWith(BobbyMockFactory, {
                region: 'us-west-2'
            });
        });

        it('constructs the clients', () => {
            assert.calledWith(bobbyMock.defineTable, 'build');
            assert.calledWith(bobbyMock.defineTable, 'job');
            assert.calledWith(bobbyMock.defineTable, 'pipeline');
            assert.calledWith(bobbyMock.defineTable, 'user');
        });

        it('constructs the client with a defined region', () => {
            datastore = new Datastore({
                region: 'my-region'
            });

            assert.calledWith(BobbyMockFactory, {
                region: 'my-region'
            });
        });

        it('constructs the client with defined credentials', () => {
            datastore = new Datastore({
                accessKeyId: 'foo',
                secretAccessKey: 'bar'
            });

            assert.calledWith(BobbyMockFactory, {
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

            clientMock.get.yieldsAsync(null, responseMock);
            responseMock.toJSON.returns(testData);

            datastore._get(testParams, (err, data) => {
                assert.isNull(err);
                assert.deepEqual(testData, data);
                assert.calledWith(clientMock.get, testParams.params.id);
                done();
            });
        });

        it('gracefully understands that no one is returned when it does not exist', (done) => {
            clientMock.get.yieldsAsync();

            datastore._get({
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
            datastore._get({
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

            clientMock.get.yieldsAsync(testError);
            datastore._get({
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
            clientMock.create.yieldsAsync(null, clientResponse);

            datastore._save({
                table: 'pipelines',
                params: {
                    id: 'someIdToPutHere',
                    data: { key: 'value' }
                }
            }, (err, data) => {
                assert.isNotOk(err);
                assert.deepEqual(expectedResult, data);
                assert.calledWith(clientMock.create, {
                    id: 'someIdToPutHere',
                    key: 'value'
                });
                done();
            });
        });

        it('fails when it encounters an error', (done) => {
            const testError = new Error('testError');

            clientMock.create.yieldsAsync(testError);
            datastore._save({
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
            datastore._save({
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

            clientMock.update.yieldsAsync(null, clientReponse);
            clientReponse.toJSON.returns(expectedResult);

            datastore._update({
                table: 'pipelines',
                params: {
                    id,
                    data: { targetKey: 'updatedValue' }
                }
            }, (err, data) => {
                assert.isNotOk(err);
                assert.deepEqual(data, expectedResult);
                assert.calledWith(clientMock.update, {
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
            clientMock.update.yieldsAsync(testError);

            datastore._update({
                table: 'pipelines',
                params: {
                    id,
                    data: {
                        otherKey: 'value'
                    }
                }
            }, (err, data) => {
                assert.isNull(data);
                assert.calledWith(clientMock.update, {
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
            datastore._update({
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

            clientMock.update.yieldsAsync(testError);
            datastore._update({
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

        it('fails when it encounters a synchronous error', (done) => {
            const testError = new Error('testError');

            clientMock.update.throws(testError);
            datastore._update({
                table: 'pipelines',
                params: {
                    id: 'doNotCare',
                    data: {}
                }
            }, (err) => {
                assert.deepEqual(err, testError);
                done();
            });
        });
    });

    describe('scan', () => {
        const testParams = {
            table: 'pipelines',
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

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);

            for (; count > 0; count--) {
                responseMock.Items[count - 1] = dynamoItem;
            }

            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });
            datastore._scan(testParams, (err, data) => {
                assert.isNull(err);
                assert.deepEqual(testData, data);
                assert.calledWith(clientMock.scan);
                done();
            });
        });

        it('scans table when index does not exist', (done) => {
            const testFilterParams = {
                table: 'pipelines',
                params: {
                    bar: 'baz'
                },
                paginate: {
                    count: 2,
                    page: 2
                }
            };

            for (count = 4; count > 0; count--) {
                responseMock.Items[count - 1] = dynamoItem;
            }

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });
            datastore._scan(testFilterParams, (err, data) => {
                assert.isNull(err);
                assert.isOk(data);
                assert.calledWith(clientMock.scan);
                assert.notCalled(clientMock.query);
                assert.notCalled(queryChainMock.usingIndex);
                done();
            });
        });

        it('query using index with filter params', (done) => {
            const testFilterParams = {
                table: 'pipelines',
                params: {
                    foo: 'bar'
                },
                paginate: {
                    count: 2,
                    page: 2
                }
            };

            for (count = 4; count > 0; count--) {
                responseMock.Items[count - 1] = dynamoItem;
            }

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });
            datastore._scan(testFilterParams, (err, data) => {
                assert.isNull(err);
                assert.isOk(data);
                assert.calledWith(clientMock.scan);
                assert.calledWith(clientMock.query, 'bar');
                assert.calledWith(queryChainMock.usingIndex, 'fooIndex');
                done();
            });
        });

        it('query using sort option', (done) => {
            const testFilterParams = {
                table: 'pipelines',
                params: {
                    foo: 'bar'
                },
                paginate: {
                    count: 2,
                    page: 2
                },
                sort: 'ascending'
            };

            scanChainMock.ascending.returns(scanChainMock);
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            datastore._scan(testFilterParams, (err, data) => {
                assert.isNull(err);
                assert.isOk(data);
                assert.calledOnce(scanChainMock.ascending);
                done();
            });
        });

        it('scan with no sorting', (done) => {
            const testFilterParams = {
                table: 'pipelines',
                params: {},
                paginate: {
                    count: 2,
                    page: 2
                },
                sort: 'ascending'
            };

            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            datastore._scan(testFilterParams, (err, data) => {
                assert.isNull(err);
                assert.isOk(data);
                assert.notCalled(scanChainMock.descending);
                done();
            });
        });

        it('returns empty array when no keys found', (done) => {
            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);

            responseMock.Items[0] = dynamoItem;

            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });

            datastore._scan(testParams, (err, data) => {
                assert.isNull(err);
                assert.deepEqual([], data);
                assert.calledWith(clientMock.scan);
                done();
            });
        });

        it('fails when given an unknown table name', (done) => {
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(new Error('cannot find entries in table'));

            datastore._scan({
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

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.limit.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(testError);

            datastore._scan({
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
