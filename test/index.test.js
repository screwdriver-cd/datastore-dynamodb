'use strict';
const assert = require('chai').assert;
const engineDynamodbStore = require('../index');

describe('index test', () => {
    let dynamodbStore;

    beforeEach(() => {
        dynamodbStore = engineDynamodbStore().configure();
    });

    describe('get', () => {
        it('gets an item', (done) => {
            dynamodbStore.get(123, (err, data) => {
                assert.isNull(err);
                assert.deepEqual(data, {});
                done();
            });
        });
    });

    describe('scanAll', () => {
        it('scanAll gets an array of items', (done) => {
            dynamodbStore.scanAll({}, (err, data) => {
                assert.isNull(err);
                assert.deepEqual(data, []);
                done();
            });
        });
    });
});
