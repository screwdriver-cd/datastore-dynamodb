'use strict';
const Datastore = require('screwdriver-datastore-base');
const schemas = require('screwdriver-data-schema');
const vogels = require('vogels');

const DEFAULT_REGION = 'us-west-2';
// vogels.AWS.config.update({region: "REGION"}); // region must be set

class Dynamodb extends Datastore {
    constructor(config) {
        const tableName = config.tableName;
        const region = config.region || DEFAULT_REGION;

        super();
        vogels.AWS.config.update({ region });

        this.client = vogels.define(tableName, {
            hashKey: 'id',
            schema: schemas[tableName].base
        });
    }

    get(config, callback) {
        callback(null);
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
