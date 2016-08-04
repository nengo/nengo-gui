/**
 * Loads jQuery and all of the plugins we use.
 *
 * Since jQuery plugins work by modifying the global variable $,
 * we load up all of the plugins we use here so that we don't load
 * plugins multiple times.
 */

import jQuery = require("jquery");

require('imports?$=jquery,jQuery=jquery!bootstrap');
require('imports?$=jquery,jQuery=jquery!bootstrap-validator');
require('imports?$=jquery,jQuery=jquery!jqueryfiletree/src/jQueryFileTree');
require('imports?$=jquery,jQuery=jquery!jquery-ui');

export = jQuery;
