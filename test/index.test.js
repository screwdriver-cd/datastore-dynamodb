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
    let filterMock;
    let dynogelsMock;

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
        filterMock = {
            equals: sinon.stub(),
            in: sinon.stub()
        };
        scanChainMock = {
            ascending: sinon.stub(),
            descending: sinon.stub(),
            exec: sinon.stub(),
            filter: sinon.stub().returns(filterMock)
        };
        queryChainMock = {
            usingIndex: sinon.stub().returns(scanChainMock)
        };
        clientMock = {
            create: sinon.stub(),
            get: sinon.stub(),
            scan: sinon.stub().returns(scanChainMock),
            query: sinon.stub().returns(queryChainMock),
            update: sinon.stub(),
            destroy: sinon.stub()
        };

        dataSchemaMock = {
            models: {
                pipeline: {
                    base: sinon.stub(),
                    indexes: ['foo', 'ban'],
                    rangeKeys: [null, 'otherColumn'],
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
        dynogelsMock = {
            AWS: {
                config: {
                    update: sinon.stub()
                }
            },
            define: sinon.stub(),
            defineTable: sinon.stub()
        };
        dynogelsMock.define.returns(clientMock);
        mockery.registerMock('dynogels', dynogelsMock);
        mockery.registerMock('screwdriver-data-schema', dataSchemaMock);

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
            assert.calledWith(dynogelsMock.AWS.config.update, {
                region: 'us-west-2'
            });
        });

        it('constructs the clients', () => {
            assert.calledWith(dynogelsMock.define, 'build');
            assert.calledWith(dynogelsMock.define, 'job');
            assert.calledWith(dynogelsMock.define, 'pipeline');
            assert.calledWith(dynogelsMock.define, 'user');
        });

        it('constructs the client with a defined region', () => {
            datastore = new Datastore({
                region: 'my-region'
            });

            assert.calledWith(dynogelsMock.AWS.config.update, {
                region: 'my-region'
            });
        });

        it('constructs the client with defined credentials', () => {
            datastore = new Datastore({
                accessKeyId: 'foo',
                secretAccessKey: 'bar'
            });

            assert.calledWith(dynogelsMock.AWS.config.update, {
                region: 'us-west-2',
                accessKeyId: 'foo',
                secretAccessKey: 'bar'
            });
        });
    });

    describe('get', () => {
        it('gets data by id', () => {
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

            return datastore._get(testParams).then(data => {
                assert.deepEqual(data, testData);
                assert.calledWith(clientMock.get, testParams.params.id);
            });
        });

        it('gracefully understands that no one is returned when it does not exist', () => {
            clientMock.get.yieldsAsync();

            return datastore
                ._get({
                    table: 'pipelines',
                    params: {
                        id: 'someId'
                    }
                })
                .then(data => assert.isNull(data));
        });

        it('fails when given an unknown table name', () =>
            datastore
                ._get({
                    table: 'tableUnicorn',
                    params: {
                        id: 'doesNotMatter'
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.match(err.message, /Invalid table name/);
                }));

        it('fails when it encounters an error', () => {
            const testError = new Error('errorCommunicatingToApi');

            clientMock.get.yieldsAsync(testError);

            return datastore
                ._get({
                    table: 'pipelines',
                    params: {
                        id: 'someId'
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.equal(err.message, testError.message);
                });
        });
    });

    describe('save', () => {
        it('saves the data', () => {
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

            return datastore
                ._save({
                    table: 'pipelines',
                    params: {
                        id: 'someIdToPutHere',
                        data: { key: 'value' }
                    }
                })
                .then(data => {
                    assert.deepEqual(data, expectedResult);
                    assert.calledWith(clientMock.create, {
                        id: 'someIdToPutHere',
                        key: 'value'
                    });
                });
        });

        it('fails when it encounters an error', () => {
            const testError = new Error('testError');

            clientMock.create.yieldsAsync(testError);

            return datastore
                ._save({
                    table: 'pipelines',
                    params: {
                        id: 'doesNotMatter',
                        data: {}
                    }
                })
                .then(
                    () => {
                        throw new Error('Oops');
                    },
                    err => {
                        assert.isOk(err, 'Error should be returned');
                        assert.equal(err.message, testError.message);
                    }
                );
        });

        it('fails when given an unknown table name', () =>
            datastore
                ._save({
                    table: 'doesNotExist',
                    params: {
                        id: 'doesNotMatter',
                        data: {}
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.match(err.message, /Invalid table name/);
                }));
    });

    describe('remove', () => {
        it('removes data by id', () => {
            const testParams = {
                table: 'pipelines',
                params: {
                    id: 'someId'
                }
            };

            clientMock.destroy.yieldsAsync(null);

            return datastore._remove(testParams).then(data => {
                assert.isNull(data);
                assert.calledWith(clientMock.destroy, testParams.params.id);
            });
        });

        it('fails when given an unknown table name', () =>
            datastore
                ._remove({
                    table: 'tableUnicorn',
                    params: {
                        id: 'doesNotMatter'
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.match(err.message, /Invalid table name/);
                }));

        it('fails when it encounters an error', () => {
            const testError = new Error('errorCommunicatingToApi');

            clientMock.destroy.yieldsAsync(testError);

            return datastore
                ._remove({
                    table: 'pipelines',
                    params: {
                        id: 'someId'
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.match(err.message, testError.message);
                });
        });
    });

    describe('update', () => {
        it('updates the data in the datastore', () => {
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

            return datastore
                ._update({
                    table: 'pipelines',
                    params: {
                        id,
                        data: { targetKey: 'updatedValue' }
                    }
                })
                .then(data => {
                    assert.deepEqual(data, expectedResult);
                    assert.calledWith(clientMock.update, {
                        id,
                        targetKey: 'updatedValue'
                    });
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
        it('returns null when item does not exist in datastore', () => {
            const id = 'someId';
            const testError = new Error('The conditional request failed');

            testError.statusCode = 400;
            clientMock.update.yieldsAsync(testError);

            return datastore
                ._update({
                    table: 'pipelines',
                    params: {
                        id,
                        data: {
                            otherKey: 'value'
                        }
                    }
                })
                .then(data => {
                    assert.isNull(data);
                    assert.calledWith(
                        clientMock.update,
                        {
                            id,
                            otherKey: 'value'
                        },
                        {
                            expected: {
                                id
                            }
                        }
                    );
                });
        });

        it('fails when given an unknown table name', () =>
            datastore
                ._update({
                    table: 'doesNotExist',
                    params: {
                        id: 'doesNotMatter',
                        data: {}
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.match(err.message, /Invalid table name/);
                }));

        it('fails when it encounters an error', () => {
            const testError = new Error('testError');

            clientMock.update.yieldsAsync(testError);

            return datastore
                ._update({
                    table: 'pipelines',
                    params: {
                        id: 'doesNotMatter',
                        data: {}
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.equal(err.message, testError.message);
                });
        });

        it('fails when it encounters a synchronous error', () => {
            const testError = new Error('testError');

            clientMock.update.throws(testError);

            return datastore
                ._update({
                    table: 'pipelines',
                    params: {
                        id: 'doNotCare',
                        data: {}
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.equal(err.message, testError.message);
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
        let count = 4;
        const dynamoItem = { toJSON: sinon.stub() };

        it('scans all the data', () => {
            const testData = [
                {
                    id: 'data',
                    key: 'value'
                },
                {
                    id: 'data',
                    key: 'value'
                },
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
            scanChainMock.exec.yieldsAsync(null, responseMock);

            for (; count > 0; count -= 1) {
                responseMock.Items[count - 1] = dynamoItem;
            }

            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });

            return datastore._scan(testParams).then(data => {
                assert.deepEqual(data, testData);
                assert.calledWith(clientMock.scan);
            });
        });

        it('scans table when index does not exist', () => {
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

            for (count = 4; count > 0; count -= 1) {
                responseMock.Items[count - 1] = dynamoItem;
            }

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });

            return datastore._scan(testFilterParams).then(data => {
                assert.isOk(data);
                assert.calledWith(clientMock.scan);
                assert.notCalled(clientMock.query);
                assert.notCalled(queryChainMock.usingIndex);
            });
        });

        it('query using index with filter params', () => {
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

            for (count = 4; count > 0; count -= 1) {
                responseMock.Items[count - 1] = dynamoItem;
            }

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            dynamoItem.toJSON.returns({
                id: 'data',
                key: 'value'
            });

            return datastore._scan(testFilterParams).then(data => {
                assert.isOk(data);
                assert.calledWith(clientMock.scan);
                assert.calledWith(clientMock.query, 'bar');
                assert.calledWith(queryChainMock.usingIndex, 'fooIndex');
            });
        });

        it('query with multiple params', () => {
            const testFilterParams = {
                table: 'pipelines',
                params: {
                    stuff: '1234',
                    foo: 'bar'
                },
                paginate: {
                    count: 2,
                    page: 2
                },
                sort: 'ascending'
            };

            scanChainMock.ascending.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            scanChainMock.filter.returns(filterMock);

            return datastore._scan(testFilterParams).then(data => {
                assert.isOk(data);
                assert.calledWith(clientMock.scan);
                assert.calledWith(clientMock.query, 'bar');
                assert.calledWith(queryChainMock.usingIndex, 'fooIndex');
                assert.calledOnce(scanChainMock.ascending);
                assert.calledWith(scanChainMock.filter, 'stuff');
                assert.calledWith(filterMock.equals, '1234');
            });
        });

        it('query with OR', () => {
            const testFilterParams = {
                table: 'pipelines',
                params: {
                    stuff: '1234',
                    name: ['bar', 'baz']
                },
                paginate: {
                    count: 2,
                    page: 2
                }
            };

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);
            scanChainMock.filter.returns(filterMock);

            return datastore._scan(testFilterParams).then(data => {
                assert.isOk(data);
                assert.calledWith(clientMock.scan);
                assert.calledWith(scanChainMock.filter, 'stuff');
                assert.calledWith(filterMock.equals, '1234');
                assert.calledWith(scanChainMock.filter, 'name');
                assert.calledWith(filterMock.in, ['bar', 'baz']);
            });
        });

        it('query using sort option', () => {
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
            scanChainMock.exec.yieldsAsync(null, responseMock);

            return datastore._scan(testFilterParams).then(() => {
                assert.calledOnce(scanChainMock.ascending);
            });
        });

        it('scan with no sorting', () => {
            const testFilterParams = {
                table: 'pipelines',
                params: {},
                paginate: {
                    count: 2,
                    page: 2
                },
                sort: 'ascending'
            };

            clientMock.scan.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);

            return datastore._scan(testFilterParams).then(data => {
                assert.isOk(data);
                assert.notCalled(scanChainMock.ascending);
            });
        });

        it('returns empty array when no keys found', () => {
            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(null, responseMock);

            return datastore._scan(testParams).then(data => {
                assert.deepEqual(data, []);
                assert.calledWith(clientMock.scan);
            });
        });

        it('fails when given an unknown table name', () => {
            scanChainMock.exec.yieldsAsync(new Error('cannot find entries in table'));

            return datastore
                ._scan({
                    table: 'tableUnicorn',
                    params: {},
                    paginate: {
                        count: 2,
                        page: 2
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.match(err.message, /Invalid table name/);
                });
        });

        it('fails when it encounters an error', () => {
            const testError = new Error('errorCommunicatingToApi');

            scanChainMock.descending.returns(scanChainMock);
            scanChainMock.exec.yieldsAsync(testError);

            return datastore
                ._scan({
                    table: 'pipelines',
                    params: {},
                    paginate: {
                        count: 2,
                        page: 2
                    }
                })
                .then(() => {
                    throw new Error('Oops');
                })
                .catch(err => {
                    assert.isOk(err, 'Error should be returned');
                    assert.match(err.message, testError.message);
                });
        });
    });
});
