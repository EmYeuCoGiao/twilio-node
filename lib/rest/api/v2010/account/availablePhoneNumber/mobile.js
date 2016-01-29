'use strict';

var _ = require('lodash');
var Q = require('q');
var InstanceResource = require('../../../../../base/InstanceResource');
var Page = require('../../../../../base/Page');
var deserialize = require('../../../../../base/deserialize');
var values = require('../../../../../base/values');

var MobilePage;
var MobileList;
var MobileInstance;
var MobileContext;

/**
 * Initialize the MobilePage
 *
 * @param {Version} version - Version that contains the resource
 * @param {Response} response - Response from the API
 * @param {string} accountSid -
 *          A 34 character string that uniquely identifies this resource.
 * @param {string} countryCode - The country_code
 *
 * @returns MobilePage
 */
function MobilePage(version, response, accountSid, countryCode) {
  Page.prototype.constructor.call(this, version, response);

  // Path Solution
  this._solution = {
    accountSid: accountSid,
    countryCode: countryCode
  };
}

_.extend(MobilePage.prototype, Page.prototype);
MobilePage.prototype.constructor = MobilePage;

/**
 * Build an instance of MobileInstance
 *
 * @param {obj} payload - Payload response from the API
 *
 * @returns MobileInstance
 */
MobilePage.prototype.getInstance = function getInstance(payload) {
  return new MobileInstance(
    this._version,
    payload,
    this._solution.accountSid,
    this._solution.countryCode
  );
};


/**
 * Initialize the MobileList
 *
 * @param {Version} version - Version that contains the resource
 * @param {string} accountSid -
 *          A 34 character string that uniquely identifies this resource.
 * @param {string} countryCode - The country_code
 *
 * @returns MobileList
 */
function MobileList(version, accountSid, countryCode) {
  function MobileListInstance(sid) {
    return MobileListInstance.get(sid);
  }

  MobileListInstance._version = version;
  // Path Solution
  MobileListInstance._solution = {
    accountSid: accountSid,
    countryCode: countryCode
  };
  MobileListInstance._uri = _.template(
    '/Accounts/<%= accountSid %>/AvailablePhoneNumbers/<%= countryCode %>/Mobile.json' // jshint ignore:line
  )(MobileListInstance._solution);
  /**
   * Streams MobileInstance records from the API.
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
   * @param {string} [opts.areaCode] - The area_code
   * @param {string} [opts.contains] - The contains
   * @param {string} [opts.smsEnabled] - The sms_enabled
   * @param {string} [opts.mmsEnabled] - The mms_enabled
   * @param {string} [opts.voiceEnabled] - The voice_enabled
   * @param {string} [opts.excludeAllAddressRequired] -
   *          The exclude_all_address_required
   * @param {string} [opts.excludeLocalAddressRequired] -
   *          The exclude_local_address_required
   * @param {string} [opts.excludeForeignAddressRequired] -
   *          The exclude_foreign_address_required
   * @param {string} [opts.beta] - The beta
   */
  MobileListInstance.each = function each(opts) {
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
   * Lists MobileInstance records from the API as a list.
   *
   * @param {string} [opts.areaCode] - The area_code
   * @param {string} [opts.contains] - The contains
   * @param {string} [opts.smsEnabled] - The sms_enabled
   * @param {string} [opts.mmsEnabled] - The mms_enabled
   * @param {string} [opts.voiceEnabled] - The voice_enabled
   * @param {string} [opts.excludeAllAddressRequired] -
   *          The exclude_all_address_required
   * @param {string} [opts.excludeLocalAddressRequired] -
   *          The exclude_local_address_required
   * @param {string} [opts.excludeForeignAddressRequired] -
   *          The exclude_foreign_address_required
   * @param {string} [opts.beta] - The beta
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
  MobileListInstance.list = function list(opts) {
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
   * Retrieve a single page of MobileInstance records from the API.
   * Request is executed immediately
   *
   * @param {string} [opts.areaCode] - The area_code
   * @param {string} [opts.contains] - The contains
   * @param {string} [opts.smsEnabled] - The sms_enabled
   * @param {string} [opts.mmsEnabled] - The mms_enabled
   * @param {string} [opts.voiceEnabled] - The voice_enabled
   * @param {string} [opts.excludeAllAddressRequired] -
   *          The exclude_all_address_required
   * @param {string} [opts.excludeLocalAddressRequired] -
   *          The exclude_local_address_required
   * @param {string} [opts.excludeForeignAddressRequired] -
   *          The exclude_foreign_address_required
   * @param {string} [opts.beta] - The beta
   * @param {string} [opts.pageToken] - PageToken provided by the API
   * @param {number} [opts.pageNumber] -
   *          Page Number, this value is simply for client state
   * @param {number} [opts.pageSize] - Number of records to return, defaults to 50
   *
   * @returns Page of MobileInstance
   */
  MobileListInstance.page = function page(opts) {
    opts = opts || {};
    var params = values.of({
      'AreaCode': opts.areaCode,
      'Contains': opts.contains,
      'SmsEnabled': opts.smsEnabled,
      'MmsEnabled': opts.mmsEnabled,
      'VoiceEnabled': opts.voiceEnabled,
      'ExcludeAllAddressRequired': opts.excludeAllAddressRequired,
      'ExcludeLocalAddressRequired': opts.excludeLocalAddressRequired,
      'ExcludeForeignAddressRequired': opts.excludeForeignAddressRequired,
      'Beta': opts.beta,
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
      return new MobilePage(
        this._version,
        response,
        this._solution.accountSid,
        this._solution.countryCode
      );
    }.bind(this));

    return promise;
  };

  return MobileListInstance;
}


/**
 * Initialize the MobileContext
 *
 * @param {Version} version - Version that contains the resource
 * @param {object} payload - The instance payload
 *
 * @returns {MobileContext}
 */
function MobileInstance(version, payload, accountSid, countryCode) {
  InstanceResource.prototype.constructor.call(this, version);

  // Marshaled Properties
  this._properties = {
    friendlyName: payload.friendly_name, // jshint ignore:line,
    phoneNumber: payload.phone_number, // jshint ignore:line,
    lata: payload.lata, // jshint ignore:line,
    rateCenter: payload.rate_center, // jshint ignore:line,
    latitude: deserialize.decimal(payload.latitude), // jshint ignore:line,
    longitude: deserialize.decimal(payload.longitude), // jshint ignore:line,
    region: payload.region, // jshint ignore:line,
    postalCode: payload.postal_code, // jshint ignore:line,
    isoCountry: payload.iso_country, // jshint ignore:line,
    addressRequirements: payload.address_requirements, // jshint ignore:line,
    beta: payload.beta, // jshint ignore:line,
    capabilities: payload.capabilities, // jshint ignore:line,
  };

  // Context
  this._context = undefined;
  this._solution = {
    accountSid: accountSid,
    countryCode: countryCode,
  };
}

_.extend(MobileInstance.prototype, InstanceResource.prototype);
MobileInstance.prototype.constructor = MobileInstance;

Object.defineProperty(MobileInstance.prototype,
  'friendlyName', {
  get: function() {
    return this._properties.friendlyName;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'phoneNumber', {
  get: function() {
    return this._properties.phoneNumber;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'lata', {
  get: function() {
    return this._properties.lata;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'rateCenter', {
  get: function() {
    return this._properties.rateCenter;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'latitude', {
  get: function() {
    return this._properties.latitude;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'longitude', {
  get: function() {
    return this._properties.longitude;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'region', {
  get: function() {
    return this._properties.region;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'postalCode', {
  get: function() {
    return this._properties.postalCode;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'isoCountry', {
  get: function() {
    return this._properties.isoCountry;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'addressRequirements', {
  get: function() {
    return this._properties.addressRequirements;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'beta', {
  get: function() {
    return this._properties.beta;
  },
});

Object.defineProperty(MobileInstance.prototype,
  'capabilities', {
  get: function() {
    return this._properties.capabilities;
  },
});

module.exports = {
  MobilePage: MobilePage,
  MobileList: MobileList,
  MobileInstance: MobileInstance,
  MobileContext: MobileContext
};