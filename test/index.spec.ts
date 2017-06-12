import {should, expect} from "chai";
import {observable, ObservableMap} from "mobx";
import "reflect-metadata";
import {DeepObserver, getObservableType} from "../src/index";

class User {

    @observable
    username: string = "Fraktar";

    @observable
    aura = 78;

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
    }
}

class World {
    @observable
    entities = new ObservableMap<any>();
}

let events: any[] = [];

@DeepObserver((change, type, path)  => {
    console.log({change, type, path});
    events.push({change, type, path})
})
class Store {
    @observable id: number = 0;
    @observable user: User = new User();
    @observable world: World = new World();
}

const store = new Store();

should();

describe('getObservableType', function() {

    it('should be an observable array', function(){
        getObservableType(observable([])).should.equals("array");
    });
    it('should not be an observable array', function(){
        getObservableType([]).should.be.empty;
    });
    it('should be an observable map', function() {
        getObservableType(new ObservableMap()).should.equals("map");
    });
    it('should not be an observable map', function() {
        getObservableType(new Map()).should.be.empty;
    });
    it('should be an observable object', function() {
        getObservableType(observable({})).should.equals("object");
    });
    it('should not be an observable object', function() {
        getObservableType({}).should.be.empty;
    });
    it('should be a computed property');
    it('should not be a computed property');
    it('should be a boxed observable');
    it('should not be a boxed observable');
});

describe('DeepObserver decorator', function() {

    describe('Test decorator', function() {

        beforeEach(function(){
            // reset events list
            events = [];
        });

        it('should have an observable id on root object', function(){
            store.id = 1;
            events.should.have.lengthOf(1);
            events[0].change.name.should.equals("id");
        });

        it('should register an "array" op at path "Store/user/inventory/slots/1"', function () {
            store.user.inventory.slots.pop();
            events.should.have.lengthOf(1);
            events[0].type.should.equals("array");
            events[0].path.should.equals("Store/user/inventory/slots/1");

        });

        it('should register a "map" op at path "Store/world/entities/grunt0"', function () {
            store.world.entities.set("grunt0", {type: "Orc"});
            events.should.have.lengthOf(1);
            console.log(events[0].type);
            events[0].type.should.equals("map");
            events[0].path.should.equals("Store/world/entities/grunt0");

        });
    });
});