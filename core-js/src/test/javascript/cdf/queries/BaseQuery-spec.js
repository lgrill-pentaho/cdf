/*!
 * Copyright 2002 - 2015 Webdetails, a Pentaho company. All rights reserved.
 *
 * This software was developed by Webdetails and is provided under the terms
 * of the Mozilla Public License, Version 2.0, or any later version. You may not use
 * this file except in compliance with the license. If you need a copy of the license,
 * please go to http://mozilla.org/MPL/2.0/. The Initial Developer is Webdetails.
 *
 * Software distributed under the Mozilla Public License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. Please refer to
 * the license for the specific language governing your rights and limitations.
 */

define([
  "cdf/queries/BaseQuery",
  "cdf/lib/jquery",
  "cdf/Logger"
], function(BaseQuery, $, Logger) {

  var unprocessedData = {data: 0},
      processedData = {data: [1, 2, 3]},
      baseQuery;

  beforeEach(function() {
    baseQuery = new BaseQuery();
  });

  /**
   * ## Base query #
   */
  describe("Base query #", function() {

    /**
     * ## Base query # getSuccessHandler
     */
    describe("Base query # getSuccessHandler", function() {

      /**
       * ## Base query # getSuccessHandler persists the last result and the post fetch processed result
       */
      it("persists the last result and the post fetch processed result", function() {

        baseQuery.getSuccessHandler(function(data) { return processedData; })(unprocessedData);

        expect(baseQuery.getOption("lastResultSet")).toEqual(unprocessedData);
        expect(baseQuery.getOption("lastProcessedResultSet")).toEqual(processedData);
      });
    });

    /**
     * ## Base query # lastResults
     */
    describe("Base query # lastResults", function() {

      /**
       * ## Base query # lastResults throws an exception if the lastResultSet option value wasn't set
       */
      it("throws an exception if the lastResultSet option value wasn't set", function() {
        expect(function() { baseQuery.lastResults(); }).toThrow("NoCachedResults");
      });

      /**
       * ## Base query # lastResults returns a copy of the lastResultSet option value
       */
      it("returns a copy of the lastResults option value", function() {

        baseQuery.setOption('lastResultSet', unprocessedData);

        expect(baseQuery.lastResults()).toEqual(unprocessedData);
      });
    });

    /**
     * ## Base query # lastProcessedResults
     */
    describe("Base query # lastProcessedResults", function() {

      /**
       * ## Base query # lastProcessedResults throws an exception if the lastProcessedResultSet option value wasn't set
       */
      it("throws an exception if the lastProcessedResultSet option value wasn't set", function() {
        expect(function() { baseQuery.lastProcessedResults(); }).toThrow("NoCachedResults");
      });

      /**
       * ## Base query # lastProcessedResults returns a copy of the lastProcessedResultSet option value
       */
      it("returns a copy of the lastProcessedResultSet option value", function() {

        baseQuery.setOption('lastProcessedResultSet', processedData);

        expect(baseQuery.lastProcessedResults()).toEqual(processedData);
      });
    });

    /**
     * ## Base query # callbacks
     */
    describe("Base query # callbacks", function() {
      beforeEach(function() {
        baseQuery.buildQueryDefinition = function() {};
      });

      /**
       * ## Base query # has a default success callback
       */
      it("has a default success callback", function() {
        spyOn(baseQuery._optionsManager._options.successCallback, "value").and.callThrough();
        spyOn(Logger, "log").and.callThrough();
        spyOn($, "ajax").and.callFake(function(params) {
          params.success({result: true});
        });
        baseQuery.doQuery();
        expect(baseQuery._optionsManager._options.successCallback.value.calls.count()).toEqual(1);
        expect(baseQuery._optionsManager._options.successCallback.value).toHaveBeenCalledWith({result: true});
        expect(Logger.log.calls.count()).toEqual(1);
        expect(Logger.log).toHaveBeenCalledWith("Query success callback not defined. Override.");
      });

      /**
       * ## Base query # has a default error callback
       */
      it("has a default error callback", function() {
        spyOn(baseQuery._optionsManager._options.errorCallback, "value").and.callThrough();
        spyOn($, "ajax").and.callFake(function(params) {
          params.error({result: false}, "ajax error", "test error");
        });

        spyOn(Logger, "log").and.callThrough();
        baseQuery.doQuery();
        expect(baseQuery._optionsManager._options.errorCallback.value.calls.count()).toEqual(1);
        expect(baseQuery._optionsManager._options.errorCallback.value).toHaveBeenCalledWith({result: false}, "ajax error", "test error");
        expect(Logger.log.calls.count()).toEqual(1);
        expect(Logger.log).toHaveBeenCalledWith("Query error callback not defined. Override.");

        baseQuery.dashboard = {
          handleServerError: function() {
            this.errorNotification();
          },
          errorNotification: function(err, ph) { return; }
        };
        spyOn(baseQuery.dashboard, "handleServerError").and.callThrough();
        spyOn(baseQuery.dashboard, "errorNotification").and.callThrough();
        baseQuery.doQuery();
        expect(baseQuery._optionsManager._options.errorCallback.value.calls.count()).toEqual(2);
        expect(baseQuery.dashboard.handleServerError).toHaveBeenCalledWith({result: false}, "ajax error", "test error");
        expect(baseQuery.dashboard.errorNotification).toHaveBeenCalled();
      });

      /**
       * ## Base query # supports a custom success callback
       */
      it("supports a custom success callback", function(done) {
        spyOn($, "ajax").and.callFake(function(params) {
          params.success({result: true});
        });
        baseQuery.doQuery(
          function(data) { /* success callback */
            expect(data).toEqual({result: true});
            done();
          }
        );
      });

      /**
       * ## Base query # supports a custom error callback
       */
      it("supports a custom error callback", function(done) {
        spyOn($, "ajax").and.callFake(function(params) {
          params.error({result: false}, "ajax error", "test error");
        });
        baseQuery.doQuery(
          function(data) { /* success callback */ },
          function(jqXHR, textStatus, errorThrown) { /* error callback */
            expect(jqXHR).toEqual({result: false});
            expect(textStatus).toEqual("ajax error");
            expect(errorThrown).toEqual("test error");
            done();
          }
        );
      });
    });
  });
});
