// TODO jsonPatch: extract jsonPatch functionnality into an observer callback (in a separate project)
// TODO deepObserver: writes specs as tests
// TODO jsonPatch: ensure that all value are serializable (avoid class instance)

/* specs
 * 1- Model decorateor should have a name.
 * 2- The Model decorator can detect a leaf.
 * 3- The model decorator can detect a node.
 * 4- When encouter a map or a hash, he model decorator create a child node
 * 5- We can retrieve the parent of a node
 * 6- We can retrieve the children of a node
 */

// Just a wrapper to prevent the user to give an observer ID.
function deepObserve(object, callback, parentPath = ""){
  _deepObserve(object, callback, parentPath, "deepObserver@" + Math.ceil(Math.random() * 10000));
}


// Retrieve the path stored into the metadata
const getPath = (object, observerId: string, key?) => {
  const metaData = key ? 
        Reflect.getMetadata("deepObservers", object, key)
        :
        Reflect.getMetadata("deepObservers", object);

  return metaData ? metaData.find(meta => meta.observerId === observerId).path : null;
}

// TODO: instead using Math.random, should use Mobx observer registration to make sure the ID does not exist.
const _deepObserve = (object, callback, parentPath = "", observerId) => Object.keys(object).forEach(key => {
    
  // Not an observable key
  if (!mobx.isObservable(object, key)) return;
  // Already treated, detect circle dependencies in graphes
  const metaData = Reflect.getMetadata("deepObservers", object, key);
  if (metaData && metaData.find(o => o.observerId === observerId)) return;


  // Set observers recursively
  else {
    //Add the observer ID and the path of the current property from the root.
    // This means that the same object could be used in different graph or/and with different observers.
    const obsMetaData = {observerId, path: parentPath + '/' +key};
    
    const metaData = Reflect.getMetadata("deepObservers", object, key);

    if (metaData) metaData.push(obsMetaData);
    else Reflect.defineMetadata("deepObservers", [obsMetaData], object, key);

    // It is a map
    if (object[key]._hasMap){
      object[key].observe(change => {
        switch(change.type){
          case "add":
            _deepObserve(change.newValue, callback, parentPath + '/' + change.name, observerId)
            callback({
              op: "add",
              path: getPath(object, observerId, key) + '/' + change.name,
              value: change.newValue
            })
            break;
          case "update":x 
            _deepObserve(change.newValue, callback, parentPath + '/' + change.name, observerId)
            callback({
              op: "replace",
              path: getPath(object, observerId, key) + '/' + change.name,
              value: change.newValue
            })
            // TODO: remove the observer of the old value
            break;
          case "delete":
            // TODO: remove the observer of the old value
            callback({
              op: "remove",
              path: getPath(object, observerId, key) + '/' + change.name,
            })
            break;
        }
      })
      // Treat current keys
      object[key].forEach((value, name) => _deepObserve(value, callback, parentPath + '/' + name, observerId))
    }
    // It is an array
    else if (object[key].slice && Array.isArray(object[key].slice())) {
      object[key].observe(change => {
        switch(change.type){
          case "splice":
            if(change.addedCount){
              change.added.forEach((value, index) => {
                _deepObserve(value, callback, parentPath + '/' + (change.index + index) + '/' + key, observerId);
                callback({
                  op: "add",
                  path: getPath(object, observerId, key) + '/' + (change.index + index),
                  value
                });
              })
            } else if(change.removedCount){
              // TODO: remove the observer of the old value
              change.removed.forEach((value, index) => callback({
                op: "remove",
                path: getPath(object, observerId, key) + '/' + (change.index + index)
              }));
            }
            break;
          case "update":
            // TODO: remove the observer of the old value
            _deepObserve(change.newValue, callback, parentPath + '/' + change.index + '/' +key, observerId)
            callback({
              op: "replace",
              path: getPath(object, observerId, key) + '/' +change.index,
              value: change.newValue
            })
            break;

        }
      })
      // Treat current keys
      object[key].forEach((obj, index) => _deepObserve(obj, callback, parentPath + '/' + index, observerId))
    }
    else if (typeof object[key] === "object") {
      mobx.observe(object[key], change => {
        switch(change.type){
          case "add":
            callback({
              op: "add",
              path: getPath(object, observerId, key) + '/' + key + '/' + change.name,
              value: change.newValue
            });
            break;
          case "update":
            callback({
              op: "replace",
              path: getPath(object, observerId, key) + '/' + key + '/' + change.name,
              value: change.newValue
            });
        }
      });
      // Treat current keys
      Object.keys(object[key]).forEach(subKey => _deepObserve(object[key][subKey], callback, parentPath + '/' + key, observerId));
    } else {
      Reflect.defineMetadata("name", parentPath + '/' +key, object, key);
      mobx.observe(object, key, change => callback({
        op: "replace",
        path: getPath(object, observerId, key),
        value: change.newValue
      }));
    }
  }
});
 

function DeepObserver(reaction: Function) {
  return function(target: Function){

    var newConstructor = function (...args) {
      target.apply(this, args);
      deepObserve(this, reaction, target.name)
    };
   
    newConstructor.prototype = Object.create(target.prototype);
    newConstructor.prototype.constructor = target;
    return <any>newConstructor;
  }
}

class User {

  @mobx.observable
  username: string = "Fraktar"
  
  @mobx.observable
  aura = 78;

  @mobx.observable
  phase = -34;

  @mobx.observable
  inventory = {
    slots:[
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

@DeepObserver(console.log)
class Store {
  @mobx.observable
  user: User = new User();
}

const store = new Store()

store.user.inventory.slots.pop();

store.user.inventory.slots.push({
  map: mobx.observable.map()
});


store.user.username = "daniel";

store.user.username = "ds";

store.user.inventory.slots[1].map.set("loop", store);

const m = store.user.inventory.slots[1].map;

store.user.inventory.slots[0].quantity = 3;
