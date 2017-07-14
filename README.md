# Screwdriver Datastore Dynamodb
[![Version][npm-image]][npm-url] ![Downloads][downloads-image] [![Build Status][status-image]][status-url] [![Open Issues][issues-image]][issues-url] [![Dependency Status][daviddm-image]][daviddm-url] ![License][license-image]

> interface with dynamodb

## Deprecated

**Please note that this code is no longer used by the screwdriver.cd team and has not been maintained in a while. You are welcome to use and/or contribute to it at your own risk.**

## Usage

```bash
npm install screwdriver-datastore-dynamodb
```

### Initialization

Datastore DynamoDB is an extension of the screwdriver-datastore-base class and implements all of the
functions exposed.

Currently the AWS credentials will be loaded from the shared credentials file, or environment variables. [Reference to AWS SDK documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Configuring_the_SDK_in_Node_js)

http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Configuring_the_SDK_in_Node_js

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');

const datastore = new DynamoDB();
```

#### Define a specific region and credentials to interact with

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');

const irelandDatastore = new DynamoDB({
    region: 'eu-west-1',
    accessKeyId: 'foo',
    secretAccessKey: 'bar'
});
```

### get

Obtain a single record given an id. If the record does not exist, it will return `null`.

| Parameter | Type | Description |
| :-- | :-- | :-- |
|config | Object | Each of its properties defines your get operation |
|config.table | String | The datastore table name |
|config.params| Object | Each of its properties defines the get parameters |
|config.params.id| String | The ID of the item to fetch from the datastore |


**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful get operation
return datastore.get({
    table: 'fruits',
    params: {
        id: 'apple'
    }
}).then((data) => {
    console.log(data); // { color: 'red', id: 'apple', type: 'fruit' }
});

// get operation on a non-existing entry
return datastore.get({
    table: 'fruits',
    params: {
        id: 'celery'
    }
}).then((data) => {
    console.log(data); // null
});
```

###  save

Save a record in the datastore. Returns saved data.

| Parameter | Type | Description |
| :-- | :-- | :-- |
|config | Object | Each of its properties defines your get operation |
|config.table | String | The datastore table name |
|config.params| Object | Each of its properties defines the get parameters |
|config.params.id| String |  The ID that the data is associated with |
|config.params.data| Object | The data that will be saved in the datastore |

**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful save operation
return datastore.save({
    table: 'pets',
    params: {
        id: 'toto',
        data: {
            type: 'dog'
        }
    }
}).then((data) => {
    console.log(data); // { id: 'toto', type: 'dog' }
});
```

###  update

Update a record in the datastore. Returns `null` if the record does not exist

| Parameter | Type | Description |
| :-- | :-- | :-- |
|config | Object | Each of its properties defines your get operation |
|config.table | String | The datastore table name |
|config.params| Object | Each of its properties defines the get parameters |
|config.params.id| String | The ID that the data is associated with |
|config.params.data| Object | The data to be updated in the datastore |

**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful update operation
return datastore.update({
    table: 'pets',
    params: {
        id: 'toto',
        data: {
            bestFriend: 'Dorothy'
        }
    }
}).then((data) => {
    console.log(data); // { id: 'toto', type: 'dog', bestFriend: 'Dorothy' }
});

// update operation on a non-existing entry
return datastore.update({
    table: 'pets',
    params: {
        id: 'trex',
        data: {
            bestFriend: 'me'
        }
    }
}).then((data) => {
    console.log(data); // null
});
```

###  scan

Scan for records in the datastore. Returns `[]` if the table is empty. Returns error if the table does not exist.

| Parameter | Type | Description |
| :-- | :-- | :-- |
|config | Object | Each of its properties defines your get operation |
|config.table | String | The datastore table name |
|config.params| Object | Query to filter on |

**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful scan operation
return datastore.scan({
    table: 'animalNoises',
    params: {}
}).then((data) => {
    console.log(data);
});
```


## Testing

```bash
npm test
```

## License

Code licensed under the BSD 3-Clause license. See LICENSE file for terms.

[npm-image]: https://img.shields.io/npm/v/screwdriver-datastore-dynamodb.svg
[npm-url]: https://npmjs.org/package/screwdriver-datastore-dynamodb
[downloads-image]: https://img.shields.io/npm/dt/screwdriver-datastore-dynamodb.svg
[license-image]: https://img.shields.io/npm/l/screwdriver-datastore-dynamodb.svg
[issues-image]: https://img.shields.io/github/issues/screwdriver-cd/datastore-dynamodb.svg
[issues-url]: https://github.com/screwdriver-cd/datastore-dynamodb/issues
[status-image]: https://cd.screwdriver.cd/pipelines/942d23bea5e4086aeb103c0a8a09b87aba0183ee/badge
[status-url]: https://cd.screwdriver.cd/pipelines/942d23bea5e4086aeb103c0a8a09b87aba0183ee
[daviddm-image]: https://david-dm.org/screwdriver-cd/datastore-dynamodb.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/screwdriver-cd/datastore-dynamodb
