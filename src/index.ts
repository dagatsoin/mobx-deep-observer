import {
    IArrayChange, IArraySplice, IMapChange, IObjectChange, isObservableArray, isObservableMap, isObservableObject, IValueDidChange, observe
} from "mobx";
import "reflect-metadata";
import {IDeepObserverMetadata} from "./IDeepObserverMetaData";

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
function getPath(object: any, observerId: string, key?: string): string {
    const metadata = key ? Reflect.getMetadata("deepObservers", object, key) : Reflect.getMetadata("deepObservers", object);
    return metadata ? metadata.find((meta: IDeepObserverMetadata) => meta.observerId === observerId).path : "";
}

// TODO use typed JSON Patch objects
// TODO how to type change object ?
function onPatch<T>(change: IMapChange<any> | IArraySplice<any> | IArrayChange<any> | IObjectChange | IValueDidChange<any>, type: string, path: string): any {
    switch (type) {
        case "map":
            switch (change.type) {
                case "add":
                    return {
                        op: "add",
                        path,
                        value: change.newValue
                    };
                case "update":
                    return {
                        op: "replace",
                        path,
                        value: change.newValue
                    };
                case "delete":
                    return {
                        op: "remove",
                        path,
                    };
            }
            break;

        case "array":
            switch (change.type) {
                case "splice":
                    if (change.addedCount) {
                        return change.added.map((value, index) => ({
                            op: "add",
                            path,
                            value
                        }));
                    } else if (change.removedCount) {
                        return change.removed.map((value, index) => ({
                            op: "remove",
                            path
                        }));
                    }
                    break;
                case "update":
                    return ({
                        op: "replace",
                        path,
                        value: change.newValue
                    });
            }
            break;

        case "object":
            switch (change.type) {
                case "add":
                    return ({
                        op: "add",
                        path,
                        value: change.newValue
                    });
                case "update":
                    return ({
                        op: "replace",
                        path,
                        value: change.newValue
                    });
            }
            break;

        case "primitive":
            switch (change.type) {
                case "update":
                case "add":
                    return {
                        op: "replace",
                        path,
                        value: change.newValue
                    }
            }

    }

}

export function getObservableType(object: any): string {
    if (typeof object !== "object" || !object || !object.constructor) return "";
    if (object.constructor.name == "ObservableMap") return isObservableMap(object) ? "map" : "";
    else if (object.constructor.name == "ObservableArray")  return isObservableArray(object) ? "array" : "";
    else return isObservableObject(object) ? "object" : "";
}

// TODO: instead using Math.random, should use Mobx observer registration to make sure the ID does not exist.
/**
 * Internal function
 * @param object
 * @param listener
 * @param path
 * @param observerId
 * @private
 */
function _deepObserve<T>(object: any, listener: (change: IMapChange<any> | IArraySplice<any> | IArrayChange<any> | IObjectChange | IValueDidChange<any>, type: string, path: string) => void, path: string = "", observerId: string): void {
    console.log(path);

    // Guess the type of observable
    const observableType = getObservableType(object);
    // Not an observable key
    if (!observableType) {
        console.log("NOT OBSERVABLE");
        return;
    }
    console.log("Observable object", object, "of type", observableType);

    // Already treated, detect circle dependencies in graphes
    const metadata = Reflect.getMetadata("deepObservers", object);
    if (metadata && metadata.find((o: IDeepObserverMetadata) => o.observerId === observerId)) return;

    // Set observers recursively

    //Add the observer ID and the path of the current property from the root.
    // This means that the same object could be used in different graph or/and with different observers.
    const obsMetaData = {observerId, path};

    if (metadata) metadata.push(obsMetaData);
    else Reflect.defineMetadata("deepObservers", [obsMetaData], object);

    switch (observableType) {
        // It is a map
        case "map":
            console.log("IT IS A MAP", object);
            object.observe((change: IMapChange<any>) => {
                switch (change.type) {
                    case "add":
                        _deepObserve(change.newValue, listener, path + '/' + change.name, observerId);
                        break;
                    case "update":
                        _deepObserve(change.newValue, listener, path + '/' + change.name, observerId);
                        // TODO: remove the observer of the old value
                        break;

                }
                listener(change as IMapChange<any>, observableType, getPath(object, observerId) + '/' + change.name);
            });
            // Treat current keys
            object.forEach((value: any, key: string) => _deepObserve(value, listener, path + '/' + key, observerId));
            break;
        // It is an array
        case "array":
            object.observe((change: IArraySplice<any> | IArrayChange<any>) => {
                switch (change.type) {
                    case "splice":
                        if (change.addedCount) {
                            change.added.forEach((value, index) => {
                                _deepObserve(value, listener, path + '/' + (change.index + index), observerId);
                                listener(change as IArraySplice<any>, observableType, getPath(object, observerId) + '/' + (change.index + index));
                            })
                        } else if (change.removedCount) {
                            // TODO: remove the observer of the old value
                            change.removed.forEach((value, index) => {
                                listener(change as IArraySplice<any>, observableType, getPath(object, observerId) + '/' + (change.index + index));
                            });
                        }
                        break;
                    case "update":
                        // TODO: remove the observer of the old value
                        _deepObserve(change.newValue, listener, path + '/' + change.index, observerId);
                        listener(change as IArrayChange<any>, observableType, getPath(object, observerId) + '/' + change.index);
                        break;

                }
            });
            // Treat current keys
            object.forEach((obj: any, index: number) => _deepObserve(obj, listener, path + '/' + index, observerId));
            break;
        case "object":
            observe(object, (change: IObjectChange) => {
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
            Object.keys(object).forEach(key => _deepObserve(object[key], listener, path + '/' + key, observerId));

    }
}

/**
 * Wrapper to prevent the user to give an observer ID.
 * @param object
 * @param {(change: IValueDidChange<T>, path: string) => void} listener A listener which takes a change object at first argument and the path of the node
 * at second argument
 * @param {string} parentPath the path of the parent node
 */
export function deepObserve<T>(object: any, listener: (change: IValueDidChange<T>, type: string, path: string) => void, parentPath = "") {
    _deepObserve(object, listener, parentPath, "deepObserver@" + Math.ceil(Math.random() * 10000));
}

export function DeepObserver<T>(listener: (change: IValueDidChange<T>, type: string, path: string) => void) {
    return function (target: any) {

        const newConstructor = function (this: any, ...args: any[]) {
            target.apply(this, args);
            deepObserve(this, listener, target.name)
        };

        newConstructor.prototype = Object.create(target.prototype);
        newConstructor.prototype.constructor = target;
        return <any>newConstructor;
    }
}

function classDecorator<T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
        newProperty = "new property";
        hello = "override";
    }
}
