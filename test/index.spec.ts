import {should, expect} from "chai";
import {extendObservable, observable, ObservableMap} from "mobx";
import "reflect-metadata";
import {deepObserve, toJSONPatch, DeepObserver, getObservableType} from "../src/index";
import {Operation} from "../src/JSONPatch";

// Objects for decorator tests

class User {

    @observable
    private aura: number = 0;

    @observable
    username: string = "Fraktar";

    @observable
    phase = -34;

    @observable
    inventory = {
        slots: [
            {
                prefabId: "axe",
                quantity: 1,
            },
            {
                prefabId: "food",
                quantity: 43
            }
        ]
    };

    @observable
    dummy: any = {};
}

class World {
    @observable
    entities = new ObservableMap<any>();

    @observable
    anyContent: any[] = [];
}

let events: any[] = [];

@DeepObserver((change, type, path) => {
    console.log({change, type, path});
    events.push({change, type, path});
})
class Store {
    @observable id: number = 0;
    @observable user: User = new User();
    @observable world: World = new World();
}

// For function tests

const state = {
    id: 0,
    user: {
        aura: 0,

        username: "Fraktar",

        phase: -34,
        inventory: {
            slots: [
                {
                    prefabId: "axe",
                    quantity: 1,
                },
                {
                    prefabId: "food",
                    quantity: 43
                }
            ]
        },
        dummy: <any>{}
    },
    world: {
        entities: new ObservableMap<any>(),
        anyContent: []
    }
};

should();

describe("getObservableType", function () {
    it("should be an observable array", function () {
        getObservableType(observable([])).should.equals("array");
    });
    it("should not be an observable array", function () {
        getObservableType([]).should.be.empty;
    });
    it("should be an observable map", function () {
        getObservableType(new ObservableMap()).should.equals("map");
    });
    it("should not be an observable map", function () {
        getObservableType(new Map()).should.be.empty;
    });
    it("should be an observable object", function () {
        getObservableType(observable({})).should.equals("object");
    });
    it("should not be an observable object", function () {
        getObservableType({}).should.be.empty;
    });
});

describe("DeepObserver decorator", function () {

    const store = new Store();

    beforeEach(function () {
        // reset events list
        events = [];
    });

    it("should have an observable id on root object", function () {
        store.id = 1;
        events.should.have.lengthOf(1);
        events[0].change.name.should.equals("id");
    });

    it("should add an \"array\" op at path \"Store/user/inventory/slots/1\"", function () {
        store.user.inventory.slots.pop();
        events.should.have.lengthOf(1);
        events[0].type.should.equals("array");
        events[0].path.should.equals("Store/user/inventory/slots/1");
    });

    it("should add a \"map\" item at path \"Store/world/entities/grunt0\"", function () {
        store.world.entities.set("grunt0", {type: "Orc"});
        events.should.have.lengthOf(1);
        console.log(events[0].type);
        events[0].type.should.equals("map");
        events[0].change.type.should.equals("add");
        events[0].path.should.equals("Store/world/entities/grunt0");
    });

    it("should update a map entry \"Store/world/entities/grunt0\"", function () {
        store.world.entities.set("grunt0", {type: "Elf"});
        events.should.have.lengthOf(1);
        console.log(events[0].type);
        events[0].change.type.should.equals("update");
        events[0].path.should.equals("Store/world/entities/grunt0");
    });

    it("should add a map in an array\"", function () {
        store.world.anyContent.push(new ObservableMap<any>());
        events.should.have.lengthOf(1);
        events[0].type.should.equals("array");
        events[0].path.should.equals("Store/world/anyContent/0");
    });

    it("should add an array in an map\"", function () {
        store.world.anyContent[0].set("foo", "bar");
        events.should.have.lengthOf(1);
        events[0].type.should.equals("map");
        events[0].path.should.equals("Store/world/anyContent/0/foo");
    });

    it("should add an property on a object\"", function () {
        extendObservable(store.user.dummy, {foo: "bar"});
        events.should.have.lengthOf(1);
        events[0].type.should.equals("object");
        events[0].path.should.equals("Store/user/dummy/foo");
    });
});


describe("DeepObserver function", function () {

    const store = observable(state);

    deepObserve(store, (change, type, path) => {
        events.push({change, type, path});
    }, "Store");

    beforeEach(function () {
        // reset events list
        events = [];
    });

    it("should have an observable id on root object", function () {
        store.id = 1;
        events.should.have.lengthOf(1);
        events[0].change.name.should.equals("id");
    });

    it("should add an \"array\" op at path \"Store/user/inventory/slots/1\"", function () {
        store.user.inventory.slots.pop();
        events.should.have.lengthOf(1);
        events[0].type.should.equals("array");
        events[0].path.should.equals("Store/user/inventory/slots/1");
    });

    it("should add a \"map\" item at path \"Store/world/entities/grunt0\"", function () {
        store.world.entities.set("grunt0", {type: "Orc"});
        events.should.have.lengthOf(1);
        console.log(events[0].type);
        events[0].type.should.equals("map");
        events[0].change.type.should.equals("add");
        events[0].path.should.equals("Store/world/entities/grunt0");
    });

    it("should update a map entry \"Store/world/entities/grunt0\"", function () {
        store.world.entities.set("grunt0", {type: "Elf"});
        events.should.have.lengthOf(1);
        console.log(events[0].type);
        events[0].change.type.should.equals("update");
        events[0].path.should.equals("Store/world/entities/grunt0");
    });

    it("should not emit when adding a prop\"", function () {
        store.user.dummy.foo = "bar";
        events.should.have.lengthOf(0);
    });
});

describe("JSON patch", function () {

    const store = observable(state);
    let operations: Array<Operation> = [];

    deepObserve(store, (change: any, type: string, path: string) => {
        operations.push(...toJSONPatch(change, type, path));
        console.log(operations);
    }, "store");

    it("should emit a patch", function () {
        store.user.inventory.slots.pop();
        store.world.entities.set("grunt0", {type: "Orc"});
        store.world.entities.set("grunt0", {type: "Elf"});
        operations.should.be.deep.equal([
            {
                op: "remove",
                path: "store/user/inventory/slots/1"
            },
            {
                op: "add",
                path: "store/world/entities/grunt0",
                value: {
                    type: "Orc"
                }
            },
            {
                op: "replace",
                path: "store/world/entities/grunt0",
                value: {
                    type: "Elf"
                }
            }]);
    });
});