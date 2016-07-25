# Screwdriver Datastore Dynamodb
[![Version][npm-image]][npm-url] ![Downloads][downloads-image] [![Build Status][wercker-image]][wercker-url] [![Open Issues][issues-image]][issues-url] [![Dependency Status][daviddm-image]][daviddm-url] ![License][license-image]

> interface with dynamodb

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

**Arguments**

* `config` - An `object`. Each of its properties defines your get operation
* `config.table` - A `string`. The DynamoDB table name
* `config.params` - An `object`. Each of its properties defines the get parameters
* `config.params.id` - A `string`. The ID of the item to fetch from the datastore
* `callback(err, result)`  - A callback which is called when the task has succeeded. It receives the `err` and `result`, although no actual error is passed back. The result is always returned, with a `null` value designating that there is no item to be found.

**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful get operation
datastore.get({
    table: 'fruits',
    params: {
        id: 'apple'
    }
}, (err, data) => {
    console.log(data); // { color: 'red', id: 'apple', type: 'fruit' }
});

// get operation on a non-existing entry
datastore.get({
    table: 'fruits',
    params: {
        id: 'celery'
    }
}, (err, data) => {
    console.log(data); // null
});
```

###  save

Save a record in the datastore. Returns saved data.

**Arguments**

* `config` - An `object`. Each of its properties defines your save operation
* `config.table` - A `string`. The DynamoDB table name
* `config.params` - An `object`. Each of its properties defines the save parameters
* `config.params.id` - A `string`. The ID to associate the data with
* `config.params.data` - An `object`. This is what will be saved in the datastore
* `callback(err, result)`  - A callback which is called when the task has succeeded. It receives the `err` and `result`, where `result`
is the data that was saved in the DynamoDB table.

**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful save operation
datastore.save({
    table: 'pets',
    params: {
        id: 'toto',
        data: {
            type: 'dog'
        }
    }
}, (err, data) => {
    console.log(data); // { id: 'toto', type: 'dog' }
});
```

###  update

Update a record in the datastore. Returns `null` if the record does not exist

**Arguments**

* `config` - An `object`. Each of its properties defines your save operation
* `config.table` - A `string`. The DynamoDB table name
* `config.params` - An `object`. Each of its properties defines the save parameters
* `config.params.id` - A `string`. The ID to associate the data with
* `config.params.data` - An `object`. This is what will be saved in the datastore
* `callback(err, result)`  - A callback which is called when the task is completed. It receives the `err` and `result`, where `result` is the data that was saved in the datastore. Returns `null` if the record does
not exist.

**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful update operation
datastore.update({
    table: 'pets',
    params: {
        id: 'toto',
        data: {
            bestFriend: 'Dorothy'
        }
    }
}, (err, data) => {
    console.log(data); // { id: 'toto', type: 'dog', bestFriend: 'Dorothy' }
});

// update operation on a non-existing entry
datastore.update({
    table: 'pets',
    params: {
        id: 'trex',
        data: {
            bestFriend: 'me'
        }
    }
}, (err, data) => {
    console.error(err); // null
    console.log(data); // null
});
```

###  scan

Scan for records in the datastore. Returns `[]` if the table is empty. Returns error if the table does not exist.

**Arguments**

* `config` - An `object`. Each of its properties defines your save operation
* `config.table` - A `string`. The DynamoDB table name
* `config.params` - An `object`. Each of its properties defines the query parameters
* `config.paginate` - An `object`. Each of its properties defines the pagination parameters
* `config.paginate.count` - A `number`. The number of items per page
* `config.paginate.page` - An `number`. This is the page number of the set you wish for the datastore to return
* `callback(err, result)`  - A callback which is called when the task is completed. It receives the `err` and `result`, where `result` is the list of records in the table. Returns `[]` if the table is empty. Returns error if the table does not exist.

**Example**

```js
const DynamoDB = require('screwdriver-datastore-dynamodb');
const datastore = new DynamoDB();

// successful scan operation
datastore.scan({
    table: 'animalNoises',
    params: {},
    paginate: {
        page: 2,
        count: 2
    }
}, (err, data) => {
    console.log(data); // [{ id: 2, sound: 'meow' }, { id: 3, sound: 'woof' }]
});

// if animalNoises table only has 10 entries
datastore.scan({
    table: 'animalNoises',
    params: {},
    paginate: {
        page: 3,
        count: 5
    }
}, (err, data) => {
    console.log(data); // []
});

// scan operation on a non-existing entry
datastore.scan({
    table: 'unicorns',
    params: {},
    paginate: {
        page: 2,
        count: 2
    }
}, (err, data) => {
    console.error(err); // [Error: Invalid table name "unicorns"]
    console.log(data); // undefined
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
[wercker-image]: https://app.wercker.com/status/bebcdc9de9d33dc7dea39e388efec0c0
[wercker-url]: https://app.wercker.com/project/bykey/bebcdc9de9d33dc7dea39e388efec0c0
[daviddm-image]: https://david-dm.org/screwdriver-cd/datastore-dynamodb.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/screwdriver-cd/datastore-dynamodb
