'use strict';
const Datastore = require('screwdriver-datastore-base');
const clone = require('clone');
const schemas = require('screwdriver-data-schema');
const dynogels = require('dynogels');
const DEFAULT_REGION = 'us-west-2';
const MODELS = schemas.models;
const MODEL_NAMES = Object.keys(MODELS);

/**
 * Generate a Dynogel model for a specified model
 * @method defineTable
 * @param  {String}    modelName Name of the model
 * @param  {String}    [prefix]  Prefix of the table names
 * @return {DynogelModel}        Dynogel to be able to manipulate the AWS table
 */
function defineTable(modelName, prefix) {
    const schema = MODELS[modelName];
    const tableName = `${prefix || ''}${schema.tableName}`;
    const indexes = (schema.indexes || []).map((key) => ({
        hashKey: key,
        name: `${key}Index`,
        type: 'global'
    }));

    const vogelsObject = {
        hashKey: 'id',
        schema: schema.base,
        tableName,
        indexes
    };

    if (Array.isArray(schema.rangeKeys)) {
        schema.rangeKeys.forEach((rangeKey, indexNumber) => {
            if (rangeKey) {
                indexes[indexNumber].rangeKey = rangeKey;
            }
        });
    }

    return dynogels.define(modelName, vogelsObject);
}

class Dynamodb extends Datastore {
    /**
     * Constructs a Dynamodb object
     * @param  {Object} [config]         Configuration object
     * @param  {String} [config.region]  AWS region to operate in
     * @param  {String} [config.prefix]  The table prefix to use
     */
    constructor(config) {
        super();

        const awsConfig = {
            region: DEFAULT_REGION
        };

        if (config) {
            if (config.region) {
                awsConfig.region = config.region;
            }
            if (config.accessKeyId && config.secretAccessKey) {
                awsConfig.accessKeyId = config.accessKeyId;
                awsConfig.secretAccessKey = config.secretAccessKey;
            }
            this.prefix = config.prefix;
        }

        dynogels.AWS.config.update(awsConfig);

        this.clients = {};
        this.tableModels = {};

        MODEL_NAMES.forEach((modelName) => {
            const table = defineTable(modelName, this.prefix);
            const model = schemas.models[modelName];

            this.clients[model.tableName] = table;
            this.tableModels[model.tableName] = model;
        });
    }

    /**
     * Get tables in order
     * @method setup
     * @return Promise
     */
    setup() {
        return new Promise((resolve, reject) => {
            dynogels.createTables((err) => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }

    /**
     * Obtain an item from the DynamoDB table by primary key
     * @param  {Object}   config             Configuration object
     * @param  {String}   config.table       Name of the table to interact with
     * @param  {Object}   config.params      Record Data
     * @param  {String}   config.params.id   ID of the entry to fetch
     * @return {Promise}                     Resolves to the record found from datastore
     */
    _get(config) {
        const client = this.clients[config.table];

        return new Promise((resolve, reject) => {
            if (!client) {
                const err = new Error(`Invalid table name "${config.table}"`);

                return reject(err);
            }

            return client.get(config.params.id, (err, data) => {
                if (err) {
                    return reject(err);
                }
                const result = (data) ? data.toJSON() : null;

                return resolve(result);
            });
        });
    }

    /**
     * Save a item in the specified DynamoDB table
     * @param  {Object}   config             Configuration object
     * @param  {String}   config.table       Table name
     * @param  {Object}   config.params      Record data
     * @param  {String}   config.params.id   Unique id. Typically the desired primary key
     * @param  {Object}   config.params.data The data to save
     * @return {Promise}                     Resolves to the record that was saved
     */
    _save(config) {
        const id = config.params.id;
        const userData = config.params.data;
        const client = this.clients[config.table];

        return new Promise((resolve, reject) => {
            if (!client) {
                const err = new Error(`Invalid table name "${config.table}"`);

                return reject(err);
            }

            userData.id = id;

            return client.create(userData, (err, data) => {
                if (err) {
                    return reject(err);
                }

                return resolve(data.toJSON());
            });
        });
    }

    /**
     * Remove an item from the DynamoDB table by primary key
     * @param  {Object}   config             Configuration object
     * @param  {String}   config.table       Name of the table to interact with
     * @param  {Object}   config.params      Record Data
     * @param  {String}   config.params.id   ID of the entry to remove
     * @return {Promise}                     Resolves to null if remove successfully
     */
    _remove(config) {
        const client = this.clients[config.table];

        return new Promise((resolve, reject) => {
            if (!client) {
                const err = new Error(`Invalid table name "${config.table}"`);

                return reject(err);
            }

            return client.destroy(config.params.id, (err) => {
                if (err) {
                    return reject(err);
                }

                return resolve(null);
            });
        });
    }

    /**
     * Update a record in the datastore
     * @param  {Object}   config             Configuration object
     * @param  {String}   config.table       Table name
     * @param  {Object}   config.params      Record data
     * @param  {String}   config.params.id   Unique id. Typically the desired primary key
     * @param  {Object}   config.params.data The data to update with
     * @return {Promise}                     Resolves to the record that was updated
     */
    _update(config) {
        const id = config.params.id;
        const userData = config.params.data;
        const client = this.clients[config.table];
        const updateOptions = {
            expected: { id }
        };

        return new Promise((resolve, reject) => {
            if (!client) {
                const err = new Error(`Invalid table name "${config.table}"`);

                return reject(err);
            }

            userData.id = id;

            return client.update(userData, updateOptions, (err, data) => {
                if (err) {
                    if (err.statusCode === 400) {
                        return resolve(null);
                    }

                    return reject(err);
                }

                return resolve(data.toJSON());
            });
        });
    }

    /**
     * Scan records in the datastore
     * Pagination is not being used because of DynamoDB's way of combining limit and filter
     * @method scan
     * @param  {Object}   config                Configuration object
     * @param  {String}   config.table          Table name
     * @param  {Object}   [config.params]       index => values to query on
     * @param  {Object}   config.paginate       Pagination parameters
     * @param  {Number}   config.paginate.count Number of items per page
     * @param  {Number}   config.paginate.page  Specific page of the set to return
     * @param  {String}   [config.sort]         Sorting option based on GSI range key. Ascending or descending.
     * @return {Promise}                        Resolves to an array of records
     */
    _scan(config) {
        const client = this.clients[config.table];
        const model = this.tableModels[config.table];
        const filterParams = clone(config.params);

        return new Promise((resolve, reject) => {
            if (!client) {
                const err = new Error(`Invalid table name "${config.table}"`);

                return reject(err);
            }

            let scanner = client.scan();

            if (filterParams && Object.keys(filterParams).length > 0) {
                model.indexes.some(param => {
                    if (filterParams[param]) {
                        scanner = client.query(filterParams[param]).usingIndex(`${param}Index`);
                        delete filterParams[param];

                        return true;
                    }

                    return false;
                });

                Object.keys(filterParams).forEach((param) => {
                    const value = filterParams[param];

                    if (Array.isArray(value)) {
                        scanner.filter(param).in(value);
                    } else {
                        scanner.filter(param).equals(value);
                    }
                });

                scanner = (config.sort === 'ascending')
                    ? scanner.ascending() : scanner.descending();
            }

            return scanner.exec((err, data) => {
                if (err) {
                    return reject(err);
                }

                const response = data.Items.map((item) => item.toJSON());

                return resolve(response);
            });
        });
    }
}

module.exports = Dynamodb;
