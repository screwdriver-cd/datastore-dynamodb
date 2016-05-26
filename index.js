'use strict';
const vogels = require('vogels');
// const npdynamodb = require('npdynamodb');
// const AWS = require('aws-sdk');
const dataModel = require('screwdriver-data-model');

/**
 * @constructor
 * @method EngineDynamodbStore
 * @param  {Object}            config Base configuration to be merged with Dynamodb config
 */
function EngineDynamodbStore(config) {
    this.config = config || {};
    this.client = null;
}

/**
 * Configures the dynamodb store to work for a specific table
 * @method configure
 * @param  {Object}  config configuration
 */
EngineDynamodbStore.prototype.configure = function configure(config) {
    this.config = config;
    vogels.AWS.config.update(config);

    this.client = vogels.define(config.tableName, {
        hashKey: 'id',
        schema: dataModel.build.base
    });

    return this;
};

/**
 * gets a single item from Dynamodb datastore
 * @method get
 * @param  {Number}   id       item id
 * @param  {Function} callback function to call
 */
EngineDynamodbStore.prototype.get = function get(id, callback) {
    this.client.get(id, (err, data) => {
        if (err || !data) {
            return callback(err || new Error('no data returned'));
        }

        return callback(null, data.toJSON());
    });
};

/**
 * gets an array of items from Dynamodb datastore
 * @method scanAll
 * @param  {Object}   [params]
 * @param  {Object}   [params.predicate]    query parameters
 * @param  {Object}   [params.limit]        limit number of results
 * @param  {Object}   [params.startKey]     key to start from in scan
 * @param  {Function} callback function to call
 */
EngineDynamodbStore.prototype.scanAll = function scanAll(params, callback) {
    let myParams = params;
    let cb = callback;

    if (typeof params === 'function') {
        cb = params;
        myParams = {};
    }

    const scanner = this.client.scan();

    if (myParams.predicate) {
        Object.keys(myParams.predicate).forEach(key => {
            scanner.where(key).equals(myParams.predicate[key]);
        });
    }

    if (myParams.limit) {
        scanner.limit(myParams.limit);
    }

    if (myParams.startKey) {
        scanner.startKey(myParams.startKey);
    }

    scanner.exec((err, data) => {
        if (err) {
            return cb(err);
        }

        return cb(null, data.Items.map(item => item.toJSON()));
    });
};

module.exports = function createDynamodbStore(config) {
    return new EngineDynamodbStore(config);
};
