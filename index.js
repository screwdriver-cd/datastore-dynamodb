'use strict';
// const dataModel = require('screwdriver-data-model');

/**
 * @constructor
 * @method EngineDynamodbStore
 * @param  {Object}            config Base configuration to be merged with Dynamodb config
 */
function EngineDynamodbStore(config) {
    this.config = config;

    this.client = null;
}

/**
 * gets a single item from Dynamodb datastore
 * @method get
 * @param  {Number}   id       item id
 * @param  {Function} callback function to call
 */
EngineDynamodbStore.prototype.get = function get(id, callback) {
    return callback(null, {});
};

/**
 * gets an array of items from Dynamodb datastore
 * @method scanAll
 * @param  {Object}   params       query parameters
 * @param  {Function} callback function to call
 */
EngineDynamodbStore.prototype.scanAll = function scanAll(params, callback) {
    return callback(null, []);
};

/**
 * Configures the dynamodb store to work for a specific table
 * @method configure
 * @param  {Object}  config configuration
 */
EngineDynamodbStore.prototype.configure = function configure() {
    return this;
};

module.exports = function createDynamodbStore(config) {
    return new EngineDynamodbStore(config);
};
