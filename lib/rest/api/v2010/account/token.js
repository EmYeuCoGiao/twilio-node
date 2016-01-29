'use strict';

var _ = require('lodash');
var InstanceResource = require('../../../../base/InstanceResource');
var Page = require('../../../../base/Page');
var deserialize = require('../../../../base/deserialize');
var values = require('../../../../base/values');

var TokenPage;
var TokenList;
var TokenInstance;
var TokenContext;

/**
 * Initialize the TokenPage
 *
 * @param {Version} version - Version that contains the resource
 * @param {Response} response - Response from the API
 * @param {string} accountSid - The unique sid that identifies this account
 *
 * @returns TokenPage
 */
function TokenPage(version, response, accountSid) {
  Page.prototype.constructor.call(this, version, response);

  // Path Solution
  this._solution = {
    accountSid: accountSid
  };
}

_.extend(TokenPage.prototype, Page.prototype);
TokenPage.prototype.constructor = TokenPage;

/**
 * Build an instance of TokenInstance
 *
 * @param {obj} payload - Payload response from the API
 *
 * @returns TokenInstance
 */
TokenPage.prototype.getInstance = function getInstance(payload) {
  return new TokenInstance(
    this._version,
    payload,
    this._solution.accountSid
  );
};


/**
 * Initialize the TokenList
 *
 * @param {Version} version - Version that contains the resource
 * @param {string} accountSid - The unique sid that identifies this account
 *
 * @returns TokenList
 */
function TokenList(version, accountSid) {
  function TokenListInstance(sid) {
    return TokenListInstance.get(sid);
  }

  TokenListInstance._version = version;
  // Path Solution
  TokenListInstance._solution = {
    accountSid: accountSid
  };
  TokenListInstance._uri = _.template(
    '/Accounts/<%= accountSid %>/Tokens.json' // jshint ignore:line
  )(TokenListInstance._solution);
  /**
   * Create a new TokenInstance
   *
   * @returns Newly created TokenInstance
   */
  TokenListInstance.create = function create(opts) {
    opts = opts || {};
    var data = values.of({
      'Ttl': opts.ttl
    });

    var promise = this._version.create({
      uri: this._uri,
      method: 'POST',
      data: data,
    });

    promise = promise.then(function(payload) {
      return new TokenInstance(
        this._version,
        payload,
        this._solution.accountSid
      );
    }.bind(this));

    return promise;
  };

  return TokenListInstance;
}


/**
 * Initialize the TokenContext
 *
 * @param {Version} version - Version that contains the resource
 * @param {object} payload - The instance payload
 *
 * @returns {TokenContext}
 */
function TokenInstance(version, payload, accountSid) {
  InstanceResource.prototype.constructor.call(this, version);

  // Marshaled Properties
  this._properties = {
    accountSid: payload.account_sid, // jshint ignore:line,
    dateCreated: deserialize.rfc2822DateTime(payload.date_created), // jshint ignore:line,
    dateUpdated: deserialize.rfc2822DateTime(payload.date_updated), // jshint ignore:line,
    iceServers: payload.ice_servers, // jshint ignore:line,
    password: payload.password, // jshint ignore:line,
    ttl: payload.ttl, // jshint ignore:line,
    username: payload.username, // jshint ignore:line,
  };

  // Context
  this._context = undefined;
  this._solution = {
    accountSid: accountSid,
  };
}

_.extend(TokenInstance.prototype, InstanceResource.prototype);
TokenInstance.prototype.constructor = TokenInstance;

Object.defineProperty(TokenInstance.prototype,
  'accountSid', {
  get: function() {
    return this._properties.accountSid;
  },
});

Object.defineProperty(TokenInstance.prototype,
  'dateCreated', {
  get: function() {
    return this._properties.dateCreated;
  },
});

Object.defineProperty(TokenInstance.prototype,
  'dateUpdated', {
  get: function() {
    return this._properties.dateUpdated;
  },
});

Object.defineProperty(TokenInstance.prototype,
  'iceServers', {
  get: function() {
    return this._properties.iceServers;
  },
});

Object.defineProperty(TokenInstance.prototype,
  'password', {
  get: function() {
    return this._properties.password;
  },
});

Object.defineProperty(TokenInstance.prototype,
  'ttl', {
  get: function() {
    return this._properties.ttl;
  },
});

Object.defineProperty(TokenInstance.prototype,
  'username', {
  get: function() {
    return this._properties.username;
  },
});

module.exports = {
  TokenPage: TokenPage,
  TokenList: TokenList,
  TokenInstance: TokenInstance,
  TokenContext: TokenContext
};