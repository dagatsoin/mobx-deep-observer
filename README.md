# Mobx deep observer
#### The mobx state tree of the poor man.

React to change in a model tree (expect adding/removing key on a plain object).

By default, mobx.observabble tracks deeply. But observer, reaction or autorun tracks only what you access in the function. (https://github.com/mobxjs/mobx/issues/214)

If you want to observe all mutations of a deep object you will have to access all its properties. Which is not easy to write.

So I made a little abstraction over observer which works like this: 

`deepObserver(BigDeepStore, console.log);`

Internally the package use "reflect-metadata" to crawl the store tree and put an observer on each props. // Todo perf test.

## Event object

When a deep mutation is observed, the handler will receive the following event object:

```
{
  change: ... // the mobx change object (the same as observer handler)
  type: 'map', // the type
  path: 'Store/world/entities/grunt0' // the path of the change 
}

``` 

## Example

```
// Let's make some class 
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
  
// An array to store the events
let events: any[] = [];
  
/** Define the observer handler **/
@DeepObserver((change, type, path) => events.push({change, type, path}))
class Store {
  @observable id: number = 0;
  @observable user: User = new User();
  @observable world: World = new World();
}
  
const store = new Store();

// Make some mutations

store.world.entities.set("grunt0", {type: "Elf"});
console.log(events.length); // 1
console.log(events[0].change.type) // "add";
console.log(events[0].path) // ("Store/world/entities/grunt0");
  
```

## Install
// Not on npm yet

## Run tests

`npm run test`

## Todo:
- write more tests
- example with JSON patch