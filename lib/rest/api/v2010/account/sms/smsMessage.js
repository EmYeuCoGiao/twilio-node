'use strict';

var _ = require('lodash');
var Q = require('q');
var InstanceContext = require('../../../../../base/InstanceContext');
var InstanceResource = require('../../../../../base/InstanceResource');
var Page = require('../../../../../base/Page');
var deserialize = require('../../../../../base/deserialize');
var serialize = require('../../../../../base/serialize');
var values = require('../../../../../base/values');

var SmsMessagePage;
var SmsMessageList;
var SmsMessageInstance;
var SmsMessageContext;

/**
 * Initialize the SmsMessagePage
 *
 * @param {Version} version - Version that contains the resource
 * @param {Response} response - Response from the API
 * @param {string} accountSid -
 *          A 34 character string that uniquely identifies this resource.
 *
 * @returns SmsMessagePage
 */
function SmsMessagePage(version, response, accountSid) {
  Page.prototype.constructor.call(this, version, response);

  // Path Solution
  this._solution = {
    accountSid: accountSid
  };
}

_.extend(SmsMessagePage.prototype, Page.prototype);
SmsMessagePage.prototype.constructor = SmsMessagePage;

/**
 * Build an instance of SmsMessageInstance
 *
 * @param {obj} payload - Payload response from the API
 *
 * @returns SmsMessageInstance
 */
SmsMessagePage.prototype.getInstance = function getInstance(payload) {
  return new SmsMessageInstance(
    this._version,
    payload,
    this._solution.accountSid
  );
};


/**
 * Initialize the SmsMessageList
 *
 * @param {Version} version - Version that contains the resource
 * @param {string} accountSid -
 *          A 34 character string that uniquely identifies this resource.
 *
 * @returns SmsMessageList
 */
function SmsMessageList(version, accountSid) {
  function SmsMessageListInstance(sid) {
    return SmsMessageListInstance.get(sid);
  }

  SmsMessageListInstance._version = version;
  // Path Solution
  SmsMessageListInstance._solution = {
    accountSid: accountSid
  };
  SmsMessageListInstance._uri = _.template(
    '/Accounts/<%= accountSid %>/SMS/Messages.json' // jshint ignore:line
  )(SmsMessageListInstance._solution);
  /**
   * Create a new SmsMessageInstance
   *
   * @returns Newly created SmsMessageInstance
   */
  SmsMessageListInstance.create = function create(opts) {
    if (_.isUndefined(opts)) {
      throw new Error('Required parameters are missing. Please provide: to, from.');  // jshint ignore:line
    }
    if (_.isUndefined(opts.to)) {
      throw new Error('Required parameter "to" missing.');
    }
    if (_.isUndefined(opts.from)) {
      throw new Error('Required parameter "from" missing.');
    }
    var data = values.of({
      'To': opts.to,
      'From': opts.from,
      'StatusCallback': opts.statusCallback,
      'ApplicationSid': opts.applicationSid,
      'Body': opts.body,
      'MediaUrl': opts.mediaUrl
    });

    var promise = this._version.create({
      uri: this._uri,
      method: 'POST',
      data: data,
    });

    promise = promise.then(function(payload) {
      return new SmsMessageInstance(
        this._version,
        payload,
        this._solution.accountSid
      );
    }.bind(this));

    return promise;
  };

  /**
   * Streams SmsMessageInstance records from the API.
   * This operation lazily loads records as efficiently as possible until the limit
   * is reached.
   * The results are passed into the callback function, so this operation is memory efficient.
   *
   * @param {Function} opts.callback - A callback function to process records
   * @param {number} [opts.limit] -
   *         Upper limit for the number of records to return.
   *         list() guarantees never to return more than limit.
   *         Default is no limit
   * @param {number} [opts.pageSize=50] -
   *         Number of records to fetch per request,
   *         when not set will use the default value of 50 records.
   *         If no pageSize is defined but a limit is defined,
   *         list() will attempt to read the limit with the most efficient
   *         page size, i.e. min(limit, 1000)
   * @param {string} [opts.to] - The to
   * @param {string} [opts.from] - The from
   * @param {moment} [opts.dateSentBefore] - The date_sent
   * @param {moment} [opts.dateSent] - The date_sent
   * @param {moment} [opts.dateSentAfter] - The date_sent
   */
  SmsMessageListInstance.each = function each(opts) {
    opts = opts || {};
    if (!(opts && 'callback' in opts)) {
      throw new Error('opts.callback parameter required');
    }

    var currentPage = 1;
    var limits = this._version.readLimits({
      limit: opts.limit,
      pageSize: opts.pageSize
    });

    var deferred = Q.defer();
    function fetchNextPage(fn) {
      var promise = fn();

      promise.then(function(page) {
        if (_.isEmpty(page.instances)) {
          deferred.resolve();
        }

        _.each(page.instances, opts.callback);

        if ((limits.pageLimit && limits.pageLimit <= currentPage)) {
          deferred.resolve();
        } else {
          currentPage++;
          fetchNextPage(_.bind(page.nextPage, page));
        }
      });

      promise.catch(deferred.reject);
    }

    fetchNextPage(_.bind(this.page, this, opts));

    return deferred.promise;
  };

  /**
   * Lists SmsMessageInstance records from the API as a list.
   *
   * @param {string} [opts.to] - The to
   * @param {string} [opts.from] - The from
   * @param {moment} [opts.dateSentBefore] - The date_sent
   * @param {moment} [opts.dateSent] - The date_sent
   * @param {moment} [opts.dateSentAfter] - The date_sent
   * @param {number} [opts.limit] -
   *         Upper limit for the number of records to return.
   *         list() guarantees never to return more than limit.
   *         Default is no limit
   * @param {number} [opts.pageSize] -
   *         Number of records to fetch per request,
   *         when not set will use the default value of 50 records.
   *         If no page_size is defined but a limit is defined,
   *         list() will attempt to read the limit with the most
   *         efficient page size, i.e. min(limit, 1000)
   *
   * @returns {Array} A list of records
   */
  SmsMessageListInstance.list = function list(opts) {
    opts = opts || {};
    var allResources = [];
    opts.callback = function(resource) {
      allResources.push(resource);
    };

    var promise = this.each(opts);
    promise = promise.then(function() {
      return allResources;
    });

    return promise;
  };

  /**
   * Retrieve a single page of SmsMessageInstance records from the API.
   * Request is executed immediately
   *
   * @param {string} [opts.to] - The to
   * @param {string} [opts.from] - The from
   * @param {moment} [opts.dateSentBefore] - The date_sent
   * @param {moment} [opts.dateSent] - The date_sent
   * @param {moment} [opts.dateSentAfter] - The date_sent
   * @param {string} [opts.pageToken] - PageToken provided by the API
   * @param {number} [opts.pageNumber] -
   *          Page Number, this value is simply for client state
   * @param {number} [opts.pageSize] - Number of records to return, defaults to 50
   *
   * @returns Page of SmsMessageInstance
   */
  SmsMessageListInstance.page = function page(opts) {
    opts = opts || {};
    var params = values.of({
      'To': opts.to,
      'From': opts.from,
      'DateSent<': serialize.iso8601Date(opts.dateSentBefore),
      'DateSent': serialize.iso8601Date(opts.dateSent),
      'DateSent>': serialize.iso8601Date(opts.dateSentAfter),
      'PageToken': opts.pageToken,
      'Page': opts.pageNumber,
      'PageSize': opts.pageSize
    });

    var promise = version.page(
      'GET',
      this._uri,
      { params: params }
    );

    promise = promise.then(function(response) {
      return new SmsMessagePage(
        this._version,
        response,
        this._solution.accountSid
      );
    }.bind(this));

    return promise;
  };

  /**
   * Constructs a SmsMessageContext
   *
   * @param {string} sid - The sid
   *
   * @returns SmsMessageContext
   */
  SmsMessageListInstance.get = function get(sid) {
    return new SmsMessageContext(
      this._version,
      this._solution.accountSid,
      sid
    );
  };

  return SmsMessageListInstance;
}


/**
 * Initialize the SmsMessageContext
 *
 * @param {Version} version - Version that contains the resource
 * @param {object} payload - The instance payload
 * @param {sid} accountSid - The account_sid
 * @param {sid} sid - The sid
 *
 * @returns {SmsMessageContext}
 */
function SmsMessageInstance(version, payload, accountSid, sid) {
  InstanceResource.prototype.constructor.call(this, version);

  // Marshaled Properties
  this._properties = {
    accountSid: payload.account_sid, // jshint ignore:line,
    apiVersion: payload.api_version, // jshint ignore:line,
    body: payload.body, // jshint ignore:line,
    dateCreated: deserialize.rfc2822DateTime(payload.date_created), // jshint ignore:line,
    dateUpdated: deserialize.rfc2822DateTime(payload.date_updated), // jshint ignore:line,
    dateSent: deserialize.rfc2822DateTime(payload.date_sent), // jshint ignore:line,
    direction: payload.direction, // jshint ignore:line,
    from: payload.from, // jshint ignore:line,
    price: deserialize.decimal(payload.price), // jshint ignore:line,
    priceUnit: payload.price_unit, // jshint ignore:line,
    sid: payload.sid, // jshint ignore:line,
    status: payload.status, // jshint ignore:line,
    to: payload.to, // jshint ignore:line,
    uri: payload.uri, // jshint ignore:line,
  };

  // Context
  this._context = undefined;
  this._solution = {
    accountSid: accountSid,
    sid: sid || this._properties.sid,
  };
}

_.extend(SmsMessageInstance.prototype, InstanceResource.prototype);
SmsMessageInstance.prototype.constructor = SmsMessageInstance;

Object.defineProperty(SmsMessageInstance.prototype,
  '_proxy', {
  get: function() {
    if (!this._context) {
      this._context = new SmsMessageContext(
        this._version,
        this._solution.accountSid,
        this._solution.sid
      );
    }

    return this._context;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'accountSid', {
  get: function() {
    return this._properties.accountSid;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'apiVersion', {
  get: function() {
    return this._properties.apiVersion;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'body', {
  get: function() {
    return this._properties.body;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'dateCreated', {
  get: function() {
    return this._properties.dateCreated;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'dateUpdated', {
  get: function() {
    return this._properties.dateUpdated;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'dateSent', {
  get: function() {
    return this._properties.dateSent;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'direction', {
  get: function() {
    return this._properties.direction;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'from', {
  get: function() {
    return this._properties.from;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'price', {
  get: function() {
    return this._properties.price;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'priceUnit', {
  get: function() {
    return this._properties.priceUnit;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'sid', {
  get: function() {
    return this._properties.sid;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'status', {
  get: function() {
    return this._properties.status;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'to', {
  get: function() {
    return this._properties.to;
  },
});

Object.defineProperty(SmsMessageInstance.prototype,
  'uri', {
  get: function() {
    return this._properties.uri;
  },
});

/**
 * Deletes the SmsMessageInstance
 *
 * @returns true if delete succeeds, false otherwise
 */
SmsMessageInstance.prototype.remove = function remove() {
  return this._proxy.remove();
};

/**
 * Fetch a SmsMessageInstance
 *
 * @returns Fetched SmsMessageInstance
 */
SmsMessageInstance.prototype.fetch = function fetch() {
  return this._proxy.fetch();
};

/**
 * Update the SmsMessageInstance
 *
 * @param {string} [opts.body] - The body
 *
 * @returns Updated SmsMessageInstance
 */
SmsMessageInstance.prototype.update = function update(opts) {
  return this._proxy.update(
    opts
  );
};


/**
 * Initialize the SmsMessageContext
 *
 * @param {Version} version - Version that contains the resource
 * @param {sid} accountSid - The account_sid
 * @param {sid} sid - The sid
 *
 * @returns {SmsMessageContext}
 */
function SmsMessageContext(version, accountSid, sid) {
  InstanceContext.prototype.constructor.call(this, version);

  // Path Solution
  this._solution = {
    accountSid: accountSid,
    sid: sid,
  };
  this._uri = _.template(
    '/Accounts/<%= accountSid %>/SMS/Messages/<%= sid %>.json' // jshint ignore:line
  )(this._solution);
}

_.extend(SmsMessageContext.prototype, InstanceContext.prototype);
SmsMessageContext.prototype.constructor = SmsMessageContext;

/**
 * Deletes the SmsMessageInstance
 *
 * @returns true if delete succeeds, false otherwise
 */
SmsMessageContext.prototype.remove = function remove() {
  return this._version.remove({
    method: 'DELETE',
    uri: this._uri
  });
};

/**
 * Fetch a SmsMessageInstance
 *
 * @returns Fetched SmsMessageInstance
 */
SmsMessageContext.prototype.fetch = function fetch() {
  var params = values.of({});

  var promise = this._version.fetch({
    method: 'GET',
    uri: this._uri,
    params: params,
  });

  promise = promise.then(function(payload) {
    return new SmsMessageInstance(
      this._version,
      payload,
      this._solution.accountSid,
      this._solution.sid
    );
  }.bind(this));

  return promise;
};

/**
 * Update the SmsMessageInstance
 *
 * @param {string} [opts.body] - The body
 *
 * @returns Updated SmsMessageInstance
 */
SmsMessageContext.prototype.update = function update(opts) {
  opts = opts || {};
  var data = values.of({
    'Body': opts.body,
  });

  var promise = this._version.update({
    uri: this._uri,
    method: 'POST',
    data: data,
  });

  promise = promise.then(function(payload) {
    return new SmsMessageInstance(
      this.version,
      payload,
      this._solution.accountSid,
      this._solution.sid
    );
  }.bind(this));

  return promise;
};

module.exports = {
  SmsMessagePage: SmsMessagePage,
  SmsMessageList: SmsMessageList,
  SmsMessageInstance: SmsMessageInstance,
  SmsMessageContext: SmsMessageContext
};