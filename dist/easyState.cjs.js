'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var react = require('react');

var promise = Promise.resolve();
var mutateWithTask;
var currTask;

function nextTick(task) {
  currTask = task;
  if (mutateWithTask) {
    mutateWithTask();
  } else {
    promise.then(task);
  }
}

if (typeof MutationObserver !== 'undefined') {
  var counter = 0;
  var observer = new MutationObserver(onTask);
  var textNode = document.createTextNode(String(counter));
  observer.observe(textNode, { characterData: true });

  mutateWithTask = function mutateWithTask() {
    counter = (counter + 1) % 2;
    textNode.textContent = counter;
  };
}

function onTask() {
  if (currTask) {
    currTask();
  }
}

var UNOBSERVED = Symbol('unobserved');
var proxyToRaw = new WeakMap();
var rawToProxy = new WeakMap();

var ITERATE = Symbol('iterate');
var getPrototypeOf = Object.getPrototypeOf;

function has(value) {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.has.apply(this, arguments);
  }
  registerObserver(rawContext, value);
  return proto.has.apply(rawContext, arguments);
}

function get$1(value) {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.get.apply(this, arguments);
  }
  registerObserver(rawContext, value);
  return proto.get.apply(rawContext, arguments);
}

function add(value) {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.add.apply(this, arguments);
  }
  if (!proto.has.call(rawContext, value)) {
    queueObservers(rawContext, value);
    queueObservers(rawContext, ITERATE);
  }
  return proto.add.apply(rawContext, arguments);
}

function set$1(key, value) {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.set.apply(this, arguments);
  }
  if (proto.get.call(rawContext, key) !== value) {
    queueObservers(rawContext, key);
    queueObservers(rawContext, ITERATE);
  }
  return proto.set.apply(rawContext, arguments);
}

function deleteFn(value) {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.delete.apply(this, arguments);
  }
  if (proto.has.call(rawContext, value)) {
    queueObservers(rawContext, value);
    queueObservers(rawContext, ITERATE);
  }
  return proto.delete.apply(rawContext, arguments);
}

function clear() {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.clear.apply(this, arguments);
  }
  if (rawContext.size) {
    queueObservers(rawContext, ITERATE);
  }
  return proto.clear.apply(rawContext, arguments);
}

function forEach() {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.forEach.apply(this, arguments);
  }
  registerObserver(rawContext, ITERATE);
  return proto.forEach.apply(rawContext, arguments);
}

function keys() {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.keys.apply(this, arguments);
  }
  registerObserver(rawContext, ITERATE);
  return proto.keys.apply(rawContext, arguments);
}

function values() {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.values.apply(this, arguments);
  }
  registerObserver(rawContext, ITERATE);
  return proto.values.apply(rawContext, arguments);
}

function entries() {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto.entries.apply(this, arguments);
  }
  registerObserver(rawContext, ITERATE);
  return proto.entries.apply(rawContext, arguments);
}

function iterator() {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return proto[Symbol.iterator].apply(this, arguments);
  }
  registerObserver(rawContext, ITERATE);
  return proto[Symbol.iterator].apply(rawContext, arguments);
}

function getSize() {
  var rawContext = proxyToRaw.get(this);
  var proto = getPrototypeOf(this);
  if (!rawContext) {
    return Reflect.get(proto, 'size', this);
  }
  registerObserver(rawContext, ITERATE);
  return Reflect.get(proto, 'size', rawContext);
}

function instrumentMap(target) {
  target.has = has;
  target.get = get$1;
  target.set = set$1;
  target.delete = deleteFn;
  target.clear = clear;
  target.forEach = forEach;
  target.keys = keys;
  target.values = values;
  target.entries = entries;
  target[Symbol.iterator] = iterator;
  Object.defineProperty(target, 'size', { get: getSize });
}

function instrumentSet(target) {
  target.has = has;
  target.add = add;
  target.delete = deleteFn;
  target.clear = clear;
  target.forEach = forEach;
  target.keys = keys;
  target.values = values;
  target.entries = entries;
  target[Symbol.iterator] = iterator;
  Object.defineProperty(target, 'size', { get: getSize });
}

function instrumentWeakMap(target) {
  target.has = has;
  target.get = get$1;
  target.set = set$1;
  target.delete = deleteFn;
}

function instrumentWeakSet(target) {
  target.has = has;
  target.add = add;
  target.delete = deleteFn;
}

var instrumentations = new Map([[Map.prototype, instrumentMap], [Set.prototype, instrumentSet], [WeakMap.prototype, instrumentWeakMap], [WeakSet.prototype, instrumentWeakSet], [Date.prototype, false], [RegExp.prototype, false]]);

var observerStore = new WeakMap();

function storeObservable(target) {
  observerStore.set(target, Object.create(null));
}

function storeObserver(target, key, observer) {
  var observers = observerStore.get(target);
  var observersForKey = observers[key];
  if (observersForKey !== observer) {
    if (typeof observersForKey === 'object' && observersForKey.size > 0) {
      observersForKey.add(observer);
      observer[("_" + key + "_observers")] = observersForKey;
    } else if (typeof observersForKey === 'function' && !observersForKey[UNOBSERVED]) {
      observers[key] = new Set().add(observer).add(observersForKey);
    } else {
      observers[key] = observer;
    }
  }
}

function iterateObservers(target, key, fn) {
  var observers = observerStore.get(target);
  var observersForKey = observers[key];
  if (observersForKey instanceof Set) {
    observersForKey.forEach(fn);
  } else if (observersForKey) {
    fn(observersForKey);
  }
}

function releaseObserver(observer) {
  for (var key in observer) {
    observer[key].delete(observer);
  }
}

var ENUMERATE = Symbol('enumerate');
var queuedObservers = new Set();
var queued = false;
var currentObserver;
var handlers = { get: get, ownKeys: ownKeys, set: set, deleteProperty: deleteProperty };

function observe(observer) {
  if (typeof observer !== 'function') {
    throw new TypeError('Observer must be a function.');
  }
  observer[UNOBSERVED] = false;
  runObserver(observer);
  return observer;
}

function unobserve(observer) {
  queuedObservers.delete(observer);
  observer[UNOBSERVED] = true;
  releaseObserver(observer);
}







function observable(obj) {
  obj = obj || {};
  if (typeof obj !== 'object') {
    throw new TypeError('first argument must be an object or undefined');
  }
  if (proxyToRaw.has(obj)) {
    return obj;
  }
  return rawToProxy.get(obj) || instrumentObservable(obj) || createObservable(obj);
}

function instrumentObservable(obj) {
  var instrument = instrumentations.get(Object.getPrototypeOf(obj));
  if (typeof instrument === 'function') {
    instrument(obj);
  }
  
}

function createObservable(obj) {
  var observable = new Proxy(obj, handlers);
  storeObservable(obj);
  proxyToRaw.set(observable, obj);
  rawToProxy.set(obj, observable);
  return observable;
}

function get(target, key, receiver) {
  var rawTarget = proxyToRaw.get(target) || target;
  var result = Reflect.get(target, key, receiver);
  registerObserver(rawTarget, key);
  if (currentObserver && typeof result === 'object' && result !== null) {
    return observable(result);
  }
  return rawToProxy.get(result) || result;
}

function registerObserver(target, key) {
  if (currentObserver) {
    storeObserver(target, key, currentObserver);
  }
}

function ownKeys(target) {
  registerObserver(target, ENUMERATE);
  return Reflect.ownKeys(target);
}

function set(target, key, value, receiver) {
  if (typeof value === 'object' && value !== null) {
    value = proxyToRaw.get(value) || value;
  }
  if (typeof key === 'symbol' || target !== proxyToRaw.get(receiver)) {
    return Reflect.set(target, key, value, receiver);
  }
  if (key === 'length' || value !== target[key]) {
    queueObservers(target, key);
    queueObservers(target, ENUMERATE);
  }
  return Reflect.set(target, key, value, receiver);
}

function deleteProperty(target, key) {
  if (typeof key !== 'symbol' && key in target) {
    queueObservers(target, key);
    queueObservers(target, ENUMERATE);
  }
  return Reflect.deleteProperty(target, key);
}

function queueObservers(target, key) {
  if (!queued) {
    nextTick(runObservers);
    queued = true;
  }
  iterateObservers(target, key, queueObserver);
}

function queueObserver(observer) {
  if (!observer[UNOBSERVED]) {
    queuedObservers.add(observer);
  }
}

function runObservers() {
  queuedObservers.forEach(runObserver);
  queuedObservers.clear();
  queued = false;
}

function runObserver(observer) {
  try {
    currentObserver = observer;
    observer();
  } finally {
    currentObserver = undefined;
  }
}

// do not bind these, they should not be directly invoked or passed as callbacks by the user
var reactInternals = new Set(['constructor', 'render', 'componentWillMount', 'componentDidMount', 'componentWillReceiveProps', 'shouldComponentUpdate', 'componentWillUpdate', 'componentDidUpdate', 'componentWillUnmount']);

// bind the methods from proto to the passed context object and assign them to the context
function autoBind(context, proto, isReact) {
  for (var i = 0, list = Object.getOwnPropertyNames(proto); i < list.length; i += 1) {
    var key = list[i];

    var value = proto[key];

    if (typeof value === 'function' && !(isReact && reactInternals.has(key))) {
      context[key] = value.bind(context);
    }
  }
}

var REACTIVE_RENDER = Symbol('reactive render');

function easyComp(Comp) {
  if (typeof Comp !== 'function') {
    throw new TypeError('easyComp expects a component as argument.');
  }

  // wrap stateless components in a class
  if (isStatelessComp(Comp)) {
    Comp = statelessToStatefulComp(Comp);
  } else if (hasComponentShouldUpdate(Comp)) {
    // shouldComponentUpdate is optimized by easyState, overwriting it would add zero or less value
    throw new Error('easyState optimizes shouldComponentUpdate, do not implement it.');
  }

  return toReactiveComp(Comp);
}

function isStatelessComp(Comp) {
  return !(Comp.prototype && Comp.prototype.render) && !react.Component.isPrototypeOf(Comp);
}

function statelessToStatefulComp(StatelessComp) {
  var _class, _temp;

  return _temp = _class = (function (superclass) {
    function StatefulComp () {
      superclass.apply(this, arguments);
    }

    if ( superclass ) StatefulComp.__proto__ = superclass;
    StatefulComp.prototype = Object.create( superclass && superclass.prototype );
    StatefulComp.prototype.constructor = StatefulComp;

    StatefulComp.prototype.render = function render () {
      return StatelessComp.call(this, this.props, this.context);
    };

    return StatefulComp;
  }(react.Component)), _class.displayName = StatelessComp.displayName || StatelessComp.name, _class.contextTypes = StatelessComp.contextTypes, _class.propTypes = StatelessComp.propTypes, _class.defaultProps = StatelessComp.defaultProps, _temp;
}

function hasComponentShouldUpdate(Comp) {
  return typeof Comp.prototype.shouldComponentUpdate === 'function';
}

function toReactiveComp(Comp) {
  var _class2, _temp2;

  // return a HOC which overwrites render, shouldComponentUpdate and componentWillUnmount
  // it decides when to run the new reactive methods and when to proxy to the original methods
  return _temp2 = _class2 = (function (Comp) {
    function EasyHOC(props) {
      Comp.call(this, props);

      // auto bind non react specific original methods to the component instance
      autoBind(this, Comp.prototype, true);

      // turn the state into an observable object, which triggers rendering on mutations
      this.state = observable(this.state);
    }

    if ( Comp ) EasyHOC.__proto__ = Comp;
    EasyHOC.prototype = Object.create( Comp && Comp.prototype );
    EasyHOC.prototype.constructor = EasyHOC;

    EasyHOC.prototype.render = function render () {
      var this$1 = this;

      // if it is the first direct render from react call there is no reactive render yet
      if (!this[REACTIVE_RENDER]) {
        var result;
        // create a reactive render, which is automatically called by easyState on relevant state and store mutations
        // the passed function is executed right away synchronously once by easyState
        this[REACTIVE_RENDER] = observe(function () {
          // if it is the first (synchronous) execution, call the original component's render
          // this is necessary because forceUpdate can not be called synchronously inside render functions
          if (!this$1[REACTIVE_RENDER]) {
            result = Comp.prototype.render.call(this$1);
          } else {
            // if it is a later reactive, asynchronous execution - triggered by easyState - forceUpdate the original component
            // this is necessary, because calling render would require the result to be returned
            // which is not possible from this asynchronous context
            Comp.prototype.forceUpdate.call(this$1);
          }
        });
        // return the result from super.render() inside the reactive render on the first render execution
        return result;
      } else {
        // return the original component's render result on direct calls from react
        return Comp.prototype.render.call(this);
      }
    };

    // react should trigger updates on prop changes, while easyState handles state changes
    EasyHOC.prototype.shouldComponentUpdate = function shouldComponentUpdate (nextProps) {
      return false;
    };

    EasyHOC.prototype.componentWillUnmount = function componentWillUnmount () {
      // clean up memory used by easyState
      unobserve(this[REACTIVE_RENDER]);

      // also call user defined componentWillUnmount to allow the user
      // to clean up additional memory
      if (Comp.prototype.componentWillUnmount) {
        Comp.prototype.componentWillUnmount.call(this);
      }
    };

    return EasyHOC;
  }(Comp)), _class2.displayName = Comp.displayName || Comp.name, _class2.contextTypes = Comp.contextTypes, _class2.propTypes = Comp.propTypes, _class2.defaultProps = Comp.defaultProps, _temp2;
}

function easyStore(store) {
  if (typeof store !== 'object' || store === null) {
    throw new TypeError('easyStore expects an object as argument');
  }

  // create an observable object from the passed store
  // and bind all of its methods to the created observable
  var observableStore = observable(store);
  autoBind(observableStore, store, false);
  return observableStore;
}

exports.easyComp = easyComp;
exports.easyStore = easyStore;
