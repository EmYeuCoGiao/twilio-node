'use strict';

var _ = require('lodash');
var Domain = require('../base/Domain');
var V1 = require('./conversations/V1');


/**
 * Initialize conversations domain
 *
 * @constructor
 *
 * @params {Twilio} twilio - The twilio client
 *
 * @returns conversations domain
 */
function Conversations(twilio) {
  Domain.prototype.constructor.call(this, twilio, 'https://conversations.twilio.com');

  // Versions
  this._v1 = undefined;
}

_.extend(Conversations.prototype, Domain.prototype);
Conversations.prototype.constructor = Conversations;

Object.defineProperty(Conversations.prototype,
  'v1', {
  get: function() {
    this._v1 = this._v1 || new V1(this);
    return this._v1;
  },
});

Object.defineProperty(Conversations.prototype,
  'conversations', {
  get: function() {
    return this.v1.conversations;
  },
});

module.exports = Conversations;