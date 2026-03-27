'use strict';

const buildContract = require('./lib/buildContract');

module.exports.BuildContract = buildContract;
module.exports.contracts = [buildContract];
