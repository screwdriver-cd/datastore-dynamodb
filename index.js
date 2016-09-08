'use strict';
const Datastore = require('screwdriver-datastore-base');
const nodeify = require('promise-nodeify');
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
     * @param  {Function} callback           fn(err, data)
     *                                       err - Error object
     *                                       data - data from the table
     */
    _get(config, callback) {
        const client = this.clients[config.table];

        if (!client) {
            const err = new Error(`Invalid table name "${config.table}"`);

            return callback(err);
        }

        return client.get(config.params.id, (err, data) => {
            const result = (data) ? data.toJSON() : null;

            return callback(err, result);
        });
    }

    /**
     * Save a item in the specified DynamoDB table
     * @param  {Object}   config             Configuration object
     * @param  {String}   config.table       Table name
     * @param  {Object}   config.params      Record data
     * @param  {String}   config.params.id   Unique id. Typically the desired primary key
     * @param  {Object}   config.params.data The data to save
     * @param  {Function} callback           fn(err, data)
     *                                       err - Error object
     *                                       data - Data saved in the table
     */
    _save(config, callback) {
        const id = config.params.id;
        const userData = config.params.data;
        const client = this.clients[config.table];

        if (!client) {
            const err = new Error(`Invalid table name "${config.table}"`);

            return callback(err);
        }

        userData.id = id;

        return client.create(userData, (err, data) => {
            if (err) {
                return callback(err);
            }

            return callback(null, data.toJSON());
        });
    }

    /**
     * Update a record in the datastore
     * @param  {Object}   config             Configuration object
     * @param  {String}   config.table       Table name
     * @param  {Object}   config.params      Record data
     * @param  {String}   config.params.id   Unique id. Typically the desired primary key
     * @param  {Object}   config.params.data The data to update with
     * @param  {Function} callback           fn(err, data)
     *                                       err - Error object
     *                                       data - Data saved in the table
     */
    _update(config, callback) {
        const id = config.params.id;
        const userData = config.params.data;
        const client = this.clients[config.table];
        const updateOptions = {
            expected: { id }
        };

        if (!client) {
            return callback(null, null);
        }

        userData.id = id;

        const clientUpdate = new Promise((resolve, reject) => {
            client.update(userData, updateOptions, (err, data) => {
                if (err) {
                    if (err.statusCode === 400) {
                        return resolve(null);
                    }

                    return reject(err);
                }

                return resolve(data.toJSON());
            });
        });

        return nodeify(clientUpdate, callback);
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
     * @param  {Function} callback              fn(err, data)
     *                                          err - Error object
     *                                          data - List of records in the table
     */
    _scan(config, callback) {
        const client = this.clients[config.table];
        const model = this.tableModels[config.table];
        const limitTotalCount = config.paginate.page * config.paginate.count;
        const startIndex = (config.paginate.page - 1) * config.paginate.count;
        const filterParams = config.params;

        if (!client) {
            const err = new Error(`Invalid table name "${config.table}"`);

            return callback(err);
        }

        let scanner = client.scan();

        if (filterParams) {
            Object.keys(filterParams).some((param) => {
                if (model.indexes.indexOf(param) === -1) {
                    return false;
                }
                scanner = client.query(filterParams[param]).usingIndex(`${param}Index`);

                return true;
            });
        }

        return scanner.limit(limitTotalCount).exec((err, data) => {
            if (err) {
                return callback(err);
            }
            const result = data.Items.slice(startIndex);    // pick out items from page specified
            const response = result.map((item) => item.toJSON());

            return callback(null, response);
        });
    }
}

module.exports = Dynamodb;
