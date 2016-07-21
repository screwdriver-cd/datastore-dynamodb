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
        let region = DEFAULT_REGION;

        if (config && config.region) {
            region = config.region;
        }

        super();
        vogels.AWS.config.update({ region });

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
     * @param  {Object}   config       Configuration object
     * @param  {String}   config.table Name of the table to interact with
     * @param  {Object}   config.id    ID of the entry to fetch
     * @param  {Function} callback     fn(err, data)
     *                                 err - Error object
     *                                 data - data from the table
     */
    get(config, callback) {
        const client = this.client[config.table];

        if (!client) {
            const err = new Error(`invalid table name "${config.table}"`);

            return callback(err);
        }

        return client.get(config.id, (err, data) => {
            const result = (data) ? data.toJSON() : null;

            return callback(err, result);
        });
    }

    save(config, callback) {
        callback(null);
    }

    update(config, callback) {
        callback();
    }

    scan(config, callback) {
        callback();
    }
}

module.exports = Dynamodb;
