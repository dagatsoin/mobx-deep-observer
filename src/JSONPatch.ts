// Types from fast-json-patch
import {toJS} from "mobx";

export declare type Operation = AddOperation<any> | RemoveOperation | ReplaceOperation<any> | MoveOperation | CopyOperation | TestOperation<any> | GetOperation<any>;

export interface BaseOperation {
    path: string;
}
export interface AddOperation<T> extends BaseOperation {
    op: "add";
    value: T;
}
export interface RemoveOperation extends BaseOperation {
    op: "remove";
}
export interface ReplaceOperation<T> extends BaseOperation {
    op: "replace";
    value: T;
}
export interface MoveOperation extends BaseOperation {
    op: "move";
    from: string;
}
export interface CopyOperation extends BaseOperation {
    op: "copy";
    from: string;
}
export interface TestOperation<T> extends BaseOperation {
    op: "test";
    value: T;
}
export interface GetOperation<T> extends BaseOperation {
    op: "_get";
    value: T;
}

export function toJSONPatch(change: any, observableType: string, path: string): Array<Operation> {
    switch (observableType) {
        case "map":
            switch (change.type) {
                case "add":
                    return [{
                        op: "add",
                        path,
                        value: toJS(change.newValue)
                    }];

                case "update":
                    return [{
                        op: "replace",
                        path,
                        value: toJS(change.newValue)
                    }];

                case "delete":
                    return [{
                        op: "remove",
                        path,
                    }];

                default:
                    console.warn("unknown map change type", change.type);
                    return [];

            }

        case "array":
            switch (change.type) {
                case "splice":
                    if (change.addedCount) {
                        return change.added.map((value: any) => ({
                            op: "add",
                            path,
                            value: toJS(value)
                        }));
                    } else if (change.removedCount) {
                        return change.removed.map(() => ({
                            op: "remove",
                            path
                        }));
                    }
                    break;

                case "update":
                    return [{
                        op: "replace",
                        path,
                        value: toJS(change.newValue)
                    }];

                default:
                    console.warn("unknown array change type", change.type);
                    return [];
            }
            break;

        case "object":
            switch (change.type) {
                case "add":
                    return [{
                        op: "add",
                        path,
                        value: toJS(change.newValue)
                    }];

                case "update":
                    return [{
                        op: "replace",
                        path,
                        value: toJS(change.newValue)
                    }];

                default:
                    console.warn("unknown object change type", change.type);
                    return [];
            }

        default:
            console.warn("unknown object type", observableType);
            return [];
    }
    return [];
}