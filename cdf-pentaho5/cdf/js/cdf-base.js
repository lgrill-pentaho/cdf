/*!
* Copyright 2002 - 2013 Webdetails, a Pentaho company.  All rights reserved.
* 
* This software was developed by Webdetails and is provided under the terms
* of the Mozilla Public License, Version 2.0, or any later version. You may not use
* this file except in compliance with the license. If you need a copy of the license,
* please go to  http://mozilla.org/MPL/2.0/. The Initial Developer is Webdetails.
*
* Software distributed under the Mozilla Public License is distributed on an "AS IS"
* basis, WITHOUT WARRANTY OF ANY KIND, either express or  implied. Please refer to
* the license for the specific language governing your rights and limitations.
*/

var Endpoints = {

  // Dashboards.Startup.js determines webAppPath
  getWebapp: function () { return webAppPath; },

  getXmla: function () { return Endpoints.getWebapp() + "/Xmla"; },

  getPluginBase: function( plugin ) { return Endpoints.getWebapp() + "/plugin/" + plugin + "/api"; },

  getCdfBase: function () { return Endpoints.getPluginBase('pentaho-cdf'); },

  getCdaBase: function () { return Endpoints.getPluginBase('cda'); },

  getPluginEndpoint: function( plugin, endpoint ) { return Endpoints.getPluginBase(plugin) + "/" + endpoint; },

  getStorage: function ( action ) { return Endpoints.getCdfBase() + "/storage/"  + action; },

  getSettings: function ( action ) { return Endpoints.getCdfBase() + "/settings/" + action; },

  getViewAction: function () { return Endpoints.getCdfBase() + "/viewAction"; },

  getJSONSolution: function () { return Endpoints.getCdfBase() + "/getJSONSolution"; },

  getRenderHTML: function () { return Endpoints.getCdfBase() + "/RenderHtml"; },

  getExport: function () { return Endpoints.getCdfBase() + "/Export"; },

  getResource: function() { return Endpoints.getCdfBase() + "/resource" },

  getCdfXaction: function( path, action ) { 
    return getViewAction() + "?path=" + "/public/plugin-samples/" + path + "/" + action; 
  },

  getComments: function ( action ) { 

  	var endpoint = "";

  	switch( action ) {

      case 'LIST_ALL' || 'LIST_ACTIVE' || 'GET_LAST' :
        endpoint = "list";
        break;

      case 'DELETE_COMMENT':
        endpoint = "delete";
        break;

      case 'ARCHIVE_COMMENT':
        endpoint = "archive";
        break;

      case 'ADD_COMMENT':
        endpoint = "add";
        break;
    }

  	return Endpoints.getCdfBase() + "/comments/" + endpoint;
  }
};