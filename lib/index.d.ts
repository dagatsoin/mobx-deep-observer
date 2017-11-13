import { IValueDidChange } from "mobx";
import "reflect-metadata";
export declare function getObservableType(object: any): string;
// noinspection JSUnusedGlobalSymbols
/**
 * Wrapper to prevent the user to give an observer ID.
 * @param object
 * @param {(change: IValueDidChange<T>, path: string) => void} listener A listener which takes a change object at first argument and the path of the node
 * at second argument
 * @param {string} parentPath the path of the parent node
 */
export declare function deepObserve<T>(object: any, listener: (change: IValueDidChange<T>, type: string, path: string) => void, parentPath?: string): void;
// noinspection JSUnusedGlobalSymbols
export declare function DeepObserver<T>(listener: (change: IValueDidChange<T>, type: string, path: string) => void): (target: any) => any;
