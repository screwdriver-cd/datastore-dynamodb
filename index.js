'use strict';
const Datastore = require('screwdriver-datastore-base');
const clone = require('clone');
const schemas = require('screwdriver-data-schema');
const Bobby = require('screwdriver-dynamic-dynamodb');
const DEFAULT_REGION = 'us-west-2';
const MODELS = Object.keys(schemas.models);

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

        const bobby = new Bobby(awsConfig);

        this.clients = {};
        this.tableModels = {};

        MODELS.forEach((modelName) => {
            const table = bobby.defineTable(modelName, this.prefix);
            const model = schemas.models[modelName];

            this.clients[model.tableName] = table;
            this.tableModels[model.tableName] = model;
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
        const limitTotalCount = config.paginate.page * config.paginate.count;
        const startIndex = (config.paginate.page - 1) * config.paginate.count;
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
                    scanner.filter(`${param}`).equals(filterParams[param]);
                });

                scanner = (config.sort === 'ascending')
                    ? scanner.ascending() : scanner.descending();
            }

            return scanner.limit(limitTotalCount).exec((err, data) => {
                if (err) {
                    return reject(err);
                }
                const result = data.Items.slice(startIndex);    // pick out items from page specified
                const response = result.map((item) => item.toJSON());

                return resolve(response);
            });
        });
    }
}

module.exports = Dynamodb;
