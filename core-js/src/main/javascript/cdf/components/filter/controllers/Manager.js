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

/**
 * @module BaseFilter
 * @submodule Controllers
 */

define([
  'amd!../../../lib/underscore',
  '../../../lib/Tree',
  '../../../Logger',
  '../views/Views',
  './RootCtrl'
], function (_, Tree, Logger, Views, RootCtrl) {

  /**
   * Controller responsible for managing the hierarchy of views and controllers.
   *
   * When data is added to the model, the Manager reacts by creating
   * the appropriate views and respective controllers
   *
   * @class Manager
   * @constructor
   * @extends Tree
   */

  return Tree.extend(Logger).extend({
    ID: 'BaseFilter.Controllers.Manager',
    defaults: {
      model: null,
      view: null,
      controller: null,
      configuration: null
    },
    constructor: function (options) {
      this.base.apply(this, arguments);
      this.updateChildren();
      return this;
    },
    initialize: function (options) {
      if (this.get('view') == null) {
        this.addViewAndController(this.get('model'));
      }
      this.applyBindings();
      return this;
    },
    close: function () {
      this.get('view').close();
      this.get('controller').stopListening().off();
      this.stopListening();
      this.off();
      this.clear();
      return this;
    },
    applyBindings: function () {
      var that = this;
      var throttleScroll = function (f) {
        var throttleTimeMilliseconds = that.get('configuration').pagination.throttleTimeMilliseconds;
        return _.throttle(f, throttleTimeMilliseconds || 0, {
          trailing: false
        });
      };
      var throttleFilter = function (f) {
        var throttleTimeMilliseconds = that.get('view').config.view.throttleTimeMilliseconds;
        return _.throttle(f, throttleTimeMilliseconds || 0, {
          leading: false
        });
      };

      /*
       * Declare bindings to model and view
       */
      var bindings = {
        model: {
          'add': this.onNewData,
          'change:selectedItems': this.onApply,
          'selection': this.sortSiblings
        },
        view: {
          'filter': throttleFilter(this.onFilterChange),
          'scroll:reached:top': throttleScroll(this.getPreviousPage),
          'scroll:reached:bottom': throttleScroll(this.getNextPage)
        }
      };

      /*
       * Create listeners
       */
      _.each(bindings, function (bindingList, object) {
        return _.each(bindingList, function (method, event) {
          return that.listenTo(that.attributes[object], event, _.bind(method, that));
        });
      });
      this.on('post:child:selection request:child:sort', this.renderSortedChildren);
      this.on('post:child:add', this.onUpdateChildren);
      return this;
    },
    addViewAndController: function (newModel) {

      /*
       * Decide which view to use
       */
      var Controller, View, configuration, controller, newController, target;
      var shareController = true;
      if (this.parent() != null) {

        /*
         * This node is either a Group or an Item
         * Use the parent's configuration
         */
        var that = this.parent();
        configuration = that.get('configuration');
        var childConfig = configuration[that.get('view').type].view.childConfig;
        target = that.get('view').createChildNode();
        if (newModel.children()) {
          View = Views[childConfig.withChildrenPrototype];
        } else {
          View = Views[childConfig.withoutChildrenPrototype];
        }
        Controller = RootCtrl;
        controller = that.get('controller');
      } else {

        /*
         * This node is the Root.
         * A configuration object must have been passed as an option
         */
        configuration = this.get('configuration');
        target = configuration.target;
        View = Views.Root;
        Controller = RootCtrl;
        controller = null;
      }

      /*
       * Create new view
       */
      var newView = new View({
        model: newModel,
        configuration: configuration,
        target: target
      });
      this.set('view', newView);

      /*
       * Reuse the existing controller, or create a new one, if needed
       */
      if (shareController === true && controller !== null) {
        newController = controller;
        newController.bindToView(newView);
      } else {
        newController = new Controller({
          model: newModel,
          view: newView,
          configuration: configuration
        });
      }
      this.set('controller', newController);
      this.debug("addViewAndController is done for " + (newModel.get('id')) + " : " + (newModel.get('label')));
      return this;
    },
    onNewData: function (item, collection, obj) {
      var itemParent;
      this.debug("New data (" + (item.get('label')) + ") caught by " + (this.get('model').get('label')));
      itemParent = this.where({
        model: item.parent()
      });
      if (itemParent.length === 1) {
        return itemParent[0].trigger("post:child:add");
      }
    },
    onUpdateChildren: function () {
      this.debug("New data added to " + (this.get('model').get('label')) + " : updating children");
      this.updateChildren();
      this.restoreScroll();
      return this.trigger('post:update:children', this);
    },
    restoreScroll: function () {
      if (this.get('view')._scrollBar != null) {
        this.debug("This group has a scrollbar");
        if (this.previousPosition != null) {
          this.debug("Scrolling back");
          this.get('view').setScrollBarAt(this.previousPosition);
          return this.previousPosition = null;
        }
      }
    },

    /*
     * Pagination
     */
    getNextPage: function (model, event) {
      var ref;
      this.previousPosition = (ref = _.last(this.sortChildren(this.children()), 2)[0]) != null ? ref.get('view').$el : void 0;
      return this.getPage('next', model, event);
    },
    getPreviousPage: function (model, event) {
      var ref;
      this.previousPosition = (ref = _.first(this.sortChildren(this.children()), 2)[1]) != null ? ref.get('view').$el : void 0;
      return this.getPage('previous', model, event);
    },
    getPage: function (page, model, event) {
      var deferred;
      this.debug("Item " + (model.get('label')) + " requested page " + page);
      deferred = this.requestPage(page, model.root().get('searchPattern'));
      return deferred;
    },
    requestPage: function (page, searchPattern) {
      var deferred, getPage, that;
      getPage = this.get('configuration').pagination.getPage;
      if (!_.isFunction(getPage)) {
        return this;
      }
      that = this;
      deferred = getPage(page, searchPattern).then(function (json) {
        if (json.resultset != null) {
          return that.debug("getPage: got " + json.resultset.length + " more items");
        } else {
          return that.debug("getPage: no more items");
        }
      });
      return deferred;
    },

    /*
     * Child management
     */
    updateChildren: function () {
      var models;
      models = this.get('model').children();
      if (models != null) {
        models.each((function (_this) {
          return function (m) {
            var hasModel;
            if (_this.children()) {
              hasModel = _.any(_this.children().map(function (child) {
                return child.get('model') === m;
              }));
            } else {
              hasModel = false;
            }
            if (!hasModel) {
              _this.debug("adding child model " + (m.get('label')));
              return _this.addChild(m);
            }
          };
        })(this));
        this.renderSortedChildren();
        this.get('view').updateScrollBar();
      }
      return this;
    },

    /**
     * Create a new manager for this MVC tuple.
     *
     * @method addChild
     * @chainable
     */
    addChild: function (newModel) {
      var newManager;
      newManager = {
        model: newModel,
        configuration: this.get('configuration')
      };
      this.add(newManager);
      return this;
    },
    removeChild: function (model) {
      throw new Error("NotImplemented");
    },
    sortSiblings: function (model) {
      this.debug("sortSiblings: " + (this.get('model').get('label')) + " was triggered from " + (model.get('label')) + ":" + (model.getSelection()));
      if (this.get('model') !== model) {
        return this;
      }
      if (this.parent()) {
        return this.parent().trigger('request:child:sort');
      }
    },
    /**
     * Gets an array containing the sorter functions. The most significant
     * sorter function should be placed at the beginning of the array.
     *
     * @method getSorters
     * @return {Array} an array with the available sorter functions
     */
    getSorters: function () {
      var type = this.children().first().get('view').type;
      var customSorters = this.get('configuration')[type].sorter;

      if (_.isFunction(customSorters)) {
        return [customSorters];
      } else if (_.isArray(customSorters)) {
        return customSorters;
      } else {
        return [];
      }
    },
    /**
     * Sorts a collection according to one or more custom sorter functions.
     * This function uses underscore's sortBy function. In order to
     * support multiple sorter functions we need to apply them in reverse order,
     * starting with the least significant and ending with the most significant.
     * The most significant should be placed at the beginning of the custom sorter
     * functions array.
     *
     * @method sortChildren
     * @param {Array} children the array to be sorted
     * @return {Array} the sorted array
     */
    sortChildren: function (children) {
      var customSorters = this.getSorters();
      if (_.isEmpty(customSorters)) {
        return children;
      }

      var sorterIdx = customSorters.length;
      var configuration = this.get('configuration');
      var orderedChildren = _.chain(children);

      // apply sorters in reverse order, from least to most important sorter
      while (sorterIdx--) {
        orderedChildren = orderedChildren.sortBy(function (child, idx) {
          return customSorters[sorterIdx](null, child.item.get('model'), configuration);
        });
      }
      return orderedChildren.value();
    },
    /**
     * Renders an array of sorted children.
     *
     * @method renderSortedChildren
     * @chainable
     */
    renderSortedChildren: function () {
      var $nursery;
      if (!this.children()) {
        return this;
      }

      $nursery = this.get('view').getChildrenContainer();
      $nursery.hide();
      this._appendChildren(this.sortChildren(this._detachChildren()));
      $nursery.show();

      return this;
    },
    _detachChildren: function () {
      var children;
      if (this.children()) {
        children = this.children().map(function (child) {
          var result;
          result = {
            item: child,
            target: child.get('view').$el.detach()
          };
          return result;
        });
      } else {
        children = null;
      }
      return children;
    },
    _appendChildren: function (children) {
      if (children != null) {
        _.each(children, (function (_this) {
          return function (child) {
            return _this.get('view').appendChildNode(child.target);
          };
        })(this));
      }
      return this;
    },

    /**
     * React to the user typing in the search box.
     *
     * @method onFilterChange
     * @param {String} text the new search pattern
     * @for Manager
     */
    onFilterChange: function (text) {
      if(this.get('model').root().get('searchPattern') === text) {
        return;
      }
      this.get('model').root().set('searchPattern', text);
      var filter = _.bind(function () {
        this.filter(text, "", this.get('configuration').search.matcher);
        return this.get('model').setVisibility(true);
      }, this);
      if (this.get('configuration').search.serverSide === true) {
        this.requestPage(0, text).then(function () {
          filter();
        });
      }
      filter();
    },
    filter: function (text, prefix, customMatcher) {

      /*
       * decide on item visibility based on a match to a filter string
       * The children are processed first in order to ensure the visibility is reset correctly
       * if the user decides to delete/clear the search box
       */
      var fullString, isMatch;
      fullString = _.chain(['label']).map((function (_this) {
        return function (property) {
          return _this.get('model').get(property);
        };
      })(this)).compact().value().join(' ');
      if (prefix) {
        fullString = prefix + fullString;
      }
      if (this.children()) {
        isMatch = _.any(this.children().map(function (manager) {
          var childIsMatch;
          childIsMatch = manager.filter(text, fullString, customMatcher);
          manager.get('model').setVisibility(childIsMatch);
          return childIsMatch;
        }));
      } else if (_.isEmpty(text)) {
        isMatch = true;
      } else {
        if (_.isFunction(customMatcher)) {
          isMatch = customMatcher(fullString, text);
        } else {
          isMatch = fullString.toLowerCase().indexOf(text.toLowerCase()) > -1;
        }
        this.debug("fullstring  " + fullString + " match to " + text + ": " + isMatch);
      }
      this.get('model').setVisibility(isMatch);
      return isMatch;
    },

    /*
     * Management of selected items
     */
    onApply: function (model) {
      return this.onFilterChange('');
    }

  });
});
