"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var mobx_1 = require("mobx");
require("reflect-metadata");
// TODO jsonPatch: extract jsonPatch functionnality into an observer listener (in a separate project)
// TODO deepObserver: writes specs as tests
// TODO jsonPatch: ensure that all value are serializable (avoid class instance)
// TODO  handle computed
/* specs
 * 1- Model decorator should have a name.
 * 2- The Model decorator can detect a leaf.
 * 3- The model decorator can detect a node.
 * 4- When encounter a map or a hash, he model decorator create a child node
 * 5- We can retrieve the parent of a node
 * 6- We can retrieve the children of a node
 */
/**
 * Retrieve the path stored into the metadata
 * @param object
 * @param observerId
 * @param key
 * @return {string|null}
 */
function getPath(object, observerId, key) {
    var metadata = key ? Reflect.getMetadata("deepObservers", object, key) : Reflect.getMetadata("deepObservers", object);
    return metadata ? metadata.find(function (meta) { return meta.observerId === observerId; }).path : "";
}
function getObservableType(object) {
    if (typeof object !== "object" || !object || !object.constructor)
        return "";
    if (object.constructor.name == "ObservableMap")
        return mobx_1.isObservableMap(object) ? "map" : "";
    else if (object.constructor.name == "ObservableArray")
        return mobx_1.isObservableArray(object) ? "array" : "";
    else
        return mobx_1.isObservableObject(object) ? "object" : "";
}
exports.getObservableType = getObservableType;
// TODO: instead using Math.random, should use Mobx observer registration to make sure the ID does not exist.
/**
 * Internal function
 * @param object
 * @param listener
 * @param path
 * @param observerId
 * @private
 */
function _deepObserve(object, listener, path, observerId) {
    //console.log(path);
    if (path === void 0) { path = ""; }
    // Guess the type of observable
    var observableType = getObservableType(object);
    // Not an observable key
    if (!observableType) {
        //console.log("NOT OBSERVABLE");
        return;
    }
    //console.log("Observable object", object, "of type", observableType);
    // Already treated, detect circle dependencies in graphes
    var metadata = Reflect.getMetadata("deepObservers", object);
    if (metadata && metadata.find(function (o) { return o.observerId === observerId; }))
        return;
    // Set observers recursively
    //Add the observer ID and the path of the current property from the root.
    // This means that the same object could be used in different graph or/and with different observers.
    var obsMetaData = { observerId: observerId, path: path };
    if (metadata)
        metadata.push(obsMetaData);
    else
        Reflect.defineMetadata("deepObservers", [obsMetaData], object);
    switch (observableType) {
        // It is a map
        case "map":
            //console.log("IT IS A MAP", object);
            object.observe(function (change) {
                switch (change.type) {
                    case "add":
                        _deepObserve(change.newValue, listener, path + '/' + change.name, observerId);
                        break;
                    case "update":
                        _deepObserve(change.newValue, listener, path + '/' + change.name, observerId);
                        // TODO: remove the observer of the old value
                        break;
                }
                listener(change, observableType, getPath(object, observerId) + '/' + change.name);
            });
            // Treat current keys
            object.forEach(function (value, key) { return _deepObserve(value, listener, path + '/' + key, observerId); });
            break;
        // It is an array
        case "array":
            object.observe(function (change) {
                switch (change.type) {
                    case "splice":
                        if (change.addedCount) {
                            change.added.forEach(function (value, index) {
                                _deepObserve(value, listener, path + '/' + (change.index + index), observerId);
                                listener(change, observableType, getPath(object, observerId) + '/' + (change.index + index));
                            });
                        }
                        else if (change.removedCount) {
                            // TODO: remove the observer of the old value
                            change.removed.forEach(function (value, index) {
                                listener(change, observableType, getPath(object, observerId) + '/' + (change.index + index));
                            });
                        }
                        break;
                    case "update":
                        // TODO: remove the observer of the old value
                        _deepObserve(change.newValue, listener, path + '/' + change.index, observerId);
                        listener(change, observableType, getPath(object, observerId) + '/' + change.index);
                        break;
                }
            });
            // Treat current keys
            object.forEach(function (obj, index) { return _deepObserve(obj, listener, path + '/' + index, observerId); });
            break;
        case "object":
            //console.log("IT IS AN OBJECT")
            mobx_1.observe(object, function (change) {
                switch (change.type) {
                    case "add":
                        listener(change, "object", getPath(object, observerId) + '/' + change.name);
                        break;
                    case "update":
                        listener(change, "object", getPath(object, observerId) + '/' + change.name);
                }
                _deepObserve(change.newValue, listener, path + '/' + change.name, observerId);
            });
            // Treat current keys
            Object.keys(object).forEach(function (key) { return _deepObserve(object[key], listener, path + '/' + key, observerId); });
    }
}
/**
 * Wrapper to prevent the user to give an observer ID.
 * @param object
 * @param {(change: IValueDidChange<T>, path: string) => void} listener A listener which takes a change object at first argument and the path of the node
 * at second argument
 * @param {string} parentPath the path of the parent node
 */
function deepObserve(object, listener, parentPath) {
    if (parentPath === void 0) { parentPath = ""; }
    _deepObserve(object, listener, parentPath, "deepObserver@" + Math.ceil(Math.random() * 10000));
}
exports.deepObserve = deepObserve;
function DeepObserver(listener) {
    return function (target) {
        var newConstructor = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            target.apply(this, args);
            deepObserve(this, listener, target.name);
        };
        newConstructor.prototype = Object.create(target.prototype);
        newConstructor.prototype.constructor = target;
        return newConstructor;
    };
}
exports.DeepObserver = DeepObserver;
function classDecorator(constructor) {
    return (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.newProperty = "new property";
            _this.hello = "override";
            return _this;
        }
        return class_1;
    }(constructor));
}
//# sourceMappingURL=index.js.map