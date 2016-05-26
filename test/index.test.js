'use strict';
const assert = require('chai').assert;
const engineDynamodbStore = require('../index');
const vogels = require('vogels');
const buildModel = require('screwdriver-data-model').build.base;

const DYNAMO_CONFIG = {
    apiVersion: '2012-08-10',
    endpoint: 'http://localhost:8000/',
    region: 'us-west-1',
    accessKeyId: 'here is key',
    secretAccessKey: 'here is secret key',
    tableName: 'builds'
};

const BUILDS = [{
    id: 1,
    jobId: 1234,
    runNumber: 13,
    container: 'node:4',
    cause: 'idontknow',
    createTime: Date.now(),
    status: 'SUCCESS'
}, {
    id: 2,
    jobId: 1234,
    runNumber: 14,
    container: 'node:4',
    cause: 'idontknow',
    createTime: Date.now() + 10,
    status: 'SUCCESS'
}, {
    id: 3,
    jobId: 1234,
    runNumber: 15,
    container: 'node:6',
    cause: 'idontknow',
    createTime: Date.now() + 20,
    status: 'SUCCESS'
}];

let builds;

/**
 * validates the contents of a builds matches expected
 * @method validateBuild
 * @param  {Object}      actual
 * @param  {Object}      expected
 */
function validateBuild(data, expected) {
    Object.keys(expected).forEach(key => {
        if (key === 'createTime') {
            assert.isString(data.createTime);
        } else {
            assert.equal(data[key], expected[key]);
        }
    });
}

describe('index test', () => {
    let dynamodbStore;

    before((done) => {
        // const dynamodb = new AWS.DynamoDB(DYNAMO_CONFIG);
        vogels.AWS.config.update(DYNAMO_CONFIG);

        builds = vogels.define('builds', {
            hashKey: 'id',
            schema: buildModel
        });

        vogels.createTables((err) => {
            if (err) {
                return done(err);
            }

            return builds.create(BUILDS, { overwrite: true }, done);
        });
    });

    beforeEach(() => {
        dynamodbStore = engineDynamodbStore().configure(DYNAMO_CONFIG);
    });

    describe('get', () => {
        it('gets an item', (done) => {
            dynamodbStore.get(1, (err, data) => {
                assert.isNull(err);
                validateBuild(data, BUILDS[0]);
                done();
            });
        });

        it('does not get an item that does not exist', (done) => {
            dynamodbStore.get(999, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'no data returned');
                done();
            });
        });

        it('does not get an item when the hashKey has the wrong type', (done) => {
            dynamodbStore.get('banana', (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'Type mismatch for attribute to update');
                done();
            });
        });
    });

    describe('scanAll', () => {
        it('gets an array of items', (done) => {
            dynamodbStore.scanAll({}, (err, data) => {
                assert.isNull(err);
                assert.isArray(data);
                assert.equal(data.length, 3);

                // ensure data is in the same order as expected
                const myData = data.sort((a, b) => a.id - b.id);

                BUILDS.forEach((expected, index) => {
                    validateBuild(myData[index], expected);
                });
                done();
            });
        });

        it('can handle no params config', (done) => {
            dynamodbStore.scanAll((err, data) => {
                assert.isNull(err);
                assert.isArray(data);
                assert.equal(data.length, 3);

                // ensure data is in the same order as expected
                const myData = data.sort((a, b) => a.id - b.id);

                BUILDS.forEach((expected, index) => {
                    validateBuild(myData[index], expected);
                });
                done();
            });
        });

        it('gets an array of items based on query params', (done) => {
            dynamodbStore.scanAll({ predicate: { container: 'node:4' } }, (err, data) => {
                assert.isNull(err);
                assert.isArray(data);
                assert.equal(data.length, 2);

                // ensure data is in the same order as expected
                const myData = data.sort((a, b) => a.id - b.id);

                BUILDS.slice(0, 2).forEach((expected, index) => {
                    validateBuild(myData[index], expected);
                });
                done();
            });
        });

        it('gets empty array when no items found', (done) => {
            dynamodbStore.scanAll({ predicate: { container: 'node:9001' } }, (err, data) => {
                assert.isNull(err);
                assert.isArray(data);
                assert.equal(data.length, 0);
                done();
            });
        });

        it('gets error when scan fails', (done) => {
            dynamodbStore.scanAll({ startKey: 'banana' }, (err) => {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'Type mismatch for attribute to update');
                done();
            });
        });

        it('throws if limit is stupid', () => {
            assert.throws(() => {
                dynamodbStore.scanAll({ limit: -9000 });
            }, Error, 'Limit must be greater than 0');
        });
    });

    describe('configure', () => {
        it('configures a aws dynamodb client', () => {
            assert.isDefined(dynamodbStore.client);
        });
    });
});
