'use strict';
const Datastore = require('screwdriver-datastore-base');
const schemas = require('screwdriver-data-schema');
const vogels = require('vogels');

const DEFAULT_REGION = 'us-west-2';
const TABLE_SCHEMAS = {
    builds: schemas.build.base,
    jobs: schemas.job.base,
    pipelines: schemas.pipeline.base,
    platforms: schemas.platform.base,
    users: schemas.user.base
};

class Dynamodb extends Datastore {
    /**
     * Constructs a Dynamodb object
     * @param  {Object} [config]         Configuration object
     * @param  {String} [config.region]  AWS region to operate in
     */
    constructor(config) {
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
        }

        super();
        vogels.AWS.config.update(awsConfig);

        this.client = {};
        Object.keys(TABLE_SCHEMAS).forEach((table) => {
            this.client[table] = vogels.define(table, {
                hashKey: 'id',
                schema: TABLE_SCHEMAS[table],
                tableName: table
            });
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
    get(config, callback) {
        const client = this.client[config.table];

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
    save(config, callback) {
        const id = config.params.id;
        const userData = config.params.data;
        const client = this.client[config.table];

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
    update(config, callback) {
        const id = config.params.id;
        const userData = config.params.data;
        const client = this.client[config.table];
        const updateOptions = {
            expected: { id }
        };

        if (!client) {
            return callback(null, null);
        }

        userData.id = id;

        return client.update(userData, updateOptions, (err, data) => {
            if (err) {
                if (err.statusCode === 400) {
                    return callback(null, null);
                }

                return callback(err);
            }

            return callback(err, data.toJSON());
        });
    }

    /**
     * Scan records in the datastore
     * @method scan
     * @param  {Object}   config                Configuration object
     * @param  {String}   config.table          Table name
     * @param  {Object}   [config.params]       Record data
     * @param  {Object}   config.paginate       Pagination parameters
     * @param  {Number}   config.paginate.count Number of items per page
     * @param  {Number}   config.paginate.page  Specific page of the set to return
     * @param  {Function} callback              fn(err, data)
     *                                          err - Error object
     *                                          data - List of records in the table
     */
    scan(config, callback) {
        const client = this.client[config.table];
        const limitTotalCount = config.paginate.page * config.paginate.count;
        const startIndex = (config.paginate.page - 1) * config.paginate.count;

        if (!client) {
            const err = new Error(`Invalid table name "${config.table}"`);

            return callback(err);
        }

        return client.scan().limit(limitTotalCount)  // scan all items up to and including last item specified
        .exec((err, data) => {
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
