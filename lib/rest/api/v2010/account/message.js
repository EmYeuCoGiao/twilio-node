'use strict';

var _ = require('lodash');
var Q = require('q');
var InstanceContext = require('../../../../base/InstanceContext');
var InstanceResource = require('../../../../base/InstanceResource');
var MediaList = require('./message/media').MediaList;
var Page = require('../../../../base/Page');
var deserialize = require('../../../../base/deserialize');
var serialize = require('../../../../base/serialize');
var values = require('../../../../base/values');

var MessagePage;
var MessageList;
var MessageInstance;
var MessageContext;

/**
 * Initialize the MessagePage
 *
 * @param {Version} version - Version that contains the resource
 * @param {Response} response - Response from the API
 * @param {string} accountSid - The unique sid that identifies this account
 *
 * @returns MessagePage
 */
function MessagePage(version, response, accountSid) {
  Page.prototype.constructor.call(this, version, response);

  // Path Solution
  this._solution = {
    accountSid: accountSid
  };
}

_.extend(MessagePage.prototype, Page.prototype);
MessagePage.prototype.constructor = MessagePage;

/**
 * Build an instance of MessageInstance
 *
 * @param {obj} payload - Payload response from the API
 *
 * @returns MessageInstance
 */
MessagePage.prototype.getInstance = function getInstance(payload) {
  return new MessageInstance(
    this._version,
    payload,
    this._solution.accountSid
  );
};


/**
 * Initialize the MessageList
 *
 * @param {Version} version - Version that contains the resource
 * @param {string} accountSid - The unique sid that identifies this account
 *
 * @returns MessageList
 */
function MessageList(version, accountSid) {
  function MessageListInstance(sid) {
    return MessageListInstance.get(sid);
  }

  MessageListInstance._version = version;
  // Path Solution
  MessageListInstance._solution = {
    accountSid: accountSid
  };
  MessageListInstance._uri = _.template(
    '/Accounts/<%= accountSid %>/Messages.json' // jshint ignore:line
  )(MessageListInstance._solution);
  /**
   * Create a new MessageInstance
   *
   * @returns Newly created MessageInstance
   */
  MessageListInstance.create = function create(opts) {
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
      return new MessageInstance(
        this._version,
        payload,
        this._solution.accountSid
      );
    }.bind(this));

    return promise;
  };

  /**
   * Streams MessageInstance records from the API.
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
   * @param {string} [opts.to] - Filter by messages to this number
   * @param {string} [opts.from] - Filter by from number
   * @param {moment} [opts.dateSentBefore] - Filter by date sent
   * @param {moment} [opts.dateSent] - Filter by date sent
   * @param {moment} [opts.dateSentAfter] - Filter by date sent
   */
  MessageListInstance.each = function each(opts) {
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
   * Lists MessageInstance records from the API as a list.
   *
   * @param {string} [opts.to] - Filter by messages to this number
   * @param {string} [opts.from] - Filter by from number
   * @param {moment} [opts.dateSentBefore] - Filter by date sent
   * @param {moment} [opts.dateSent] - Filter by date sent
   * @param {moment} [opts.dateSentAfter] - Filter by date sent
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
  MessageListInstance.list = function list(opts) {
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
   * Retrieve a single page of MessageInstance records from the API.
   * Request is executed immediately
   *
   * @param {string} [opts.to] - Filter by messages to this number
   * @param {string} [opts.from] - Filter by from number
   * @param {moment} [opts.dateSentBefore] - Filter by date sent
   * @param {moment} [opts.dateSent] - Filter by date sent
   * @param {moment} [opts.dateSentAfter] - Filter by date sent
   * @param {string} [opts.pageToken] - PageToken provided by the API
   * @param {number} [opts.pageNumber] -
   *          Page Number, this value is simply for client state
   * @param {number} [opts.pageSize] - Number of records to return, defaults to 50
   *
   * @returns Page of MessageInstance
   */
  MessageListInstance.page = function page(opts) {
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
      return new MessagePage(
        this._version,
        response,
        this._solution.accountSid
      );
    }.bind(this));

    return promise;
  };

  /**
   * Constructs a MessageContext
   *
   * @param {string} sid - Fetch by unique message Sid
   *
   * @returns MessageContext
   */
  MessageListInstance.get = function get(sid) {
    return new MessageContext(
      this._version,
      this._solution.accountSid,
      sid
    );
  };

  return MessageListInstance;
}


/**
 * Initialize the MessageContext
 *
 * @param {Version} version - Version that contains the resource
 * @param {object} payload - The instance payload
 * @param {sid} accountSid - The account_sid
 * @param {sid} sid - Fetch by unique message Sid
 *
 * @returns {MessageContext}
 */
function MessageInstance(version, payload, accountSid, sid) {
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
    errorCode: deserialize.integer(payload.error_code), // jshint ignore:line,
    errorMessage: payload.error_message, // jshint ignore:line,
    from: payload.from, // jshint ignore:line,
    numMedia: payload.num_media, // jshint ignore:line,
    numSegments: payload.num_segments, // jshint ignore:line,
    price: deserialize.decimal(payload.price), // jshint ignore:line,
    priceUnit: payload.price_unit, // jshint ignore:line,
    sid: payload.sid, // jshint ignore:line,
    status: payload.status, // jshint ignore:line,
    subresourceUris: payload.subresource_uris, // jshint ignore:line,
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

_.extend(MessageInstance.prototype, InstanceResource.prototype);
MessageInstance.prototype.constructor = MessageInstance;

Object.defineProperty(MessageInstance.prototype,
  '_proxy', {
  get: function() {
    if (!this._context) {
      this._context = new MessageContext(
        this._version,
        this._solution.accountSid,
        this._solution.sid
      );
    }

    return this._context;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'accountSid', {
  get: function() {
    return this._properties.accountSid;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'apiVersion', {
  get: function() {
    return this._properties.apiVersion;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'body', {
  get: function() {
    return this._properties.body;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'dateCreated', {
  get: function() {
    return this._properties.dateCreated;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'dateUpdated', {
  get: function() {
    return this._properties.dateUpdated;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'dateSent', {
  get: function() {
    return this._properties.dateSent;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'direction', {
  get: function() {
    return this._properties.direction;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'errorCode', {
  get: function() {
    return this._properties.errorCode;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'errorMessage', {
  get: function() {
    return this._properties.errorMessage;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'from', {
  get: function() {
    return this._properties.from;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'numMedia', {
  get: function() {
    return this._properties.numMedia;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'numSegments', {
  get: function() {
    return this._properties.numSegments;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'price', {
  get: function() {
    return this._properties.price;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'priceUnit', {
  get: function() {
    return this._properties.priceUnit;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'sid', {
  get: function() {
    return this._properties.sid;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'status', {
  get: function() {
    return this._properties.status;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'subresourceUris', {
  get: function() {
    return this._properties.subresourceUris;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'to', {
  get: function() {
    return this._properties.to;
  },
});

Object.defineProperty(MessageInstance.prototype,
  'uri', {
  get: function() {
    return this._properties.uri;
  },
});

/**
 * Deletes the MessageInstance
 *
 * @returns true if delete succeeds, false otherwise
 */
MessageInstance.prototype.remove = function remove() {
  return this._proxy.remove();
};

/**
 * Fetch a MessageInstance
 *
 * @returns Fetched MessageInstance
 */
MessageInstance.prototype.fetch = function fetch() {
  return this._proxy.fetch();
};

/**
 * Update the MessageInstance
 *
 * @param {string} [opts.body] - The body
 *
 * @returns Updated MessageInstance
 */
MessageInstance.prototype.update = function update(opts) {
  return this._proxy.update(
    opts
  );
};

/**
 * Access the media
 *
 * @returns media
 */
MessageInstance.prototype.media = function media() {
  return this._proxy.media;
};


/**
 * Initialize the MessageContext
 *
 * @param {Version} version - Version that contains the resource
 * @param {sid} accountSid - The account_sid
 * @param {sid} sid - Fetch by unique message Sid
 *
 * @returns {MessageContext}
 */
function MessageContext(version, accountSid, sid) {
  InstanceContext.prototype.constructor.call(this, version);

  // Path Solution
  this._solution = {
    accountSid: accountSid,
    sid: sid,
  };
  this._uri = _.template(
    '/Accounts/<%= accountSid %>/Messages/<%= sid %>.json' // jshint ignore:line
  )(this._solution);

  // Dependents
  this._media = undefined;
}

_.extend(MessageContext.prototype, InstanceContext.prototype);
MessageContext.prototype.constructor = MessageContext;

/**
 * Deletes the MessageInstance
 *
 * @returns true if delete succeeds, false otherwise
 */
MessageContext.prototype.remove = function remove() {
  return this._version.remove({
    method: 'DELETE',
    uri: this._uri
  });
};

/**
 * Fetch a MessageInstance
 *
 * @returns Fetched MessageInstance
 */
MessageContext.prototype.fetch = function fetch() {
  var params = values.of({});

  var promise = this._version.fetch({
    method: 'GET',
    uri: this._uri,
    params: params,
  });

  promise = promise.then(function(payload) {
    return new MessageInstance(
      this._version,
      payload,
      this._solution.accountSid,
      this._solution.sid
    );
  }.bind(this));

  return promise;
};

/**
 * Update the MessageInstance
 *
 * @param {string} [opts.body] - The body
 *
 * @returns Updated MessageInstance
 */
MessageContext.prototype.update = function update(opts) {
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
    return new MessageInstance(
      this.version,
      payload,
      this._solution.accountSid,
      this._solution.sid
    );
  }.bind(this));

  return promise;
};

Object.defineProperty(MessageContext.prototype,
  'media', {
  get: function() {
    if (!this._media) {
      this._media = new MediaList(
        this._version,
        this._solution.accountSid,
        this._solution.sid
      );
    }
    return this._media;
  },
});

module.exports = {
  MessagePage: MessagePage,
  MessageList: MessageList,
  MessageInstance: MessageInstance,
  MessageContext: MessageContext
};