# Mobx deep observer
#### The mobx state tree of the poor man.

React to change in a model tree (expect adding/removing key on a plain object)

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
## JSON patch
## Install
// Not on npm yet

## Todo:
- write more tests
- example with JSON patch