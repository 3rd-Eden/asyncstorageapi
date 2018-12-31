/**
 * Our internal dataset, where we store all the data.
 *
 * @type {Map}
 * @private
 */
const internal = new Map();

/**
 * Poor mans deep merge.
 *
 * @param {Object} target The data structure it needs to be merged with.
 * @param {Object} data Data that needs to be merged.
 * @private
 */
function merge(target, data) {
  Object.keys(data)
  .filter(key => data[key] instanceof Object)
  .forEach(key => Object.assign(data[key], merge(target[key], data[key])));

  return Object.assign(target || {}, data);
}

/**
 * Simple helper function to wrap all methods in a callback/promise based API
 *
 * @param {String} name Name of the method to add.
 * @param {Fucntion} fn API that needs to be executed.
 * @private
 */
function assign(name, fn) {
  function wrapper(...args) {
    return new Promise(function asPromised(resolve, reject) {
      setImmediate(async function forcedAsync() {
        let error = null;
        let callback;
        let result;

        if (typeof args[args.length - 1] === 'function') {
          callback = args.pop();
        }

        try { result = await fn(...args); }
        catch (e) { error = e; }

        if (callback) return callback(error, result);
        if (error) return reject(error);

        resolve(result);
      });
    });
  }

  wrapper.displayName = name;
  AsyncStorage[name] = wrapper;
}

/**
 * The AsyncStorage API
 *
 * In React-Native this is exported as an Object, so we need to make sure we
 * follow that exact pattern, previously we had a class instance, which
 * Object.keys() usage on the Object.
 *
 * @type {Object}
 * @public
 */
const AsyncStorage = {}

/**
 * Get an item from storage.
 *
 * @param {String} name Name of the key.
 * @returns {String|Null} Result.
 * @public
 */
assign('getItem', async function getItem(name) {
  if (!internal.has(name)) return null;

  return internal.get(name);
});

/**
 * Store a new item.
 *
 * @param {String} name Name of the key.
 * @param {String} value Data to store.
 * @public
 */
assign('setItem', async function setItem(name, value) {
  if (typeof value !== 'string') {
    throw new Error('AsyncStorage requires strings to be stored');
  }

  return internal.set(name, value);
});

/**
 * Merge the given value with the previous old value for the given key.
 *
 * @param {String} name Name of the key.
 * @param {String} value Data to merge.
 * @public
 */
assign('mergeItem', async function mergeItem(name, value) {
  if (typeof value !== 'string') {
    throw new Error('AsyncStorage requires strings to be stored');
  }

  const oldValue = JSON.parse(internal.get(name))
  const newValue = JSON.parse(value);

  return internal.set(name, JSON.stringify(merge(oldValue, newValue)));
});

/**
 * Removes the data for the given key
 *
 * @param {String} name Name of the key to remove.
 * @public
 */
assign('removeItem', async function removeItem(name) {
  return internal.delete(name);
});

/**
 * Get multipe items.
 *
 * @param {Array} names The items that needs to be returned.
 * @returns {Array} The key/value pairs.
 * @public
 */
assign('multiGet', async function multiGet(names) {
  return names.map(name => [
    name,
    internal.has(name) ? internal.get(name) : null
  ]);
});

/**
 * Set's multiple items.
 *
 * @param {Array} pairs Array with key/value pairs that need to be set.
 * @public
 */
assign('multiSet', async function multiSet(pairs) {
  pairs.forEach(pair => {
    if (typeof pair[1] !== 'string') {
      throw new Error('AsyncStorage requires strings to be stored');
    }

    internal.set(pair[0], pair[1]);
  });

  return pairs;
});

/**
 * Merges multiple items.
 *
 * @param {Array} names The items that needs to be returned.
 * @public
 */
assign('multiMerge', async function multiMerge(pairs) {
  pairs.forEach(pair => {
    if (typeof pair[1] !== 'string') {
      throw new Error('AsyncStorage requires strings to be merged');
    }

    const oldValue = JSON.parse(internal.get(pair[0]));
    const newValue = JSON.parse(pair[1]);

    internal.set(pair[0], JSON.stringify(merge(oldValue, newValue)));
  });
});

/**
 * Remove all given items
 *
 * @param {Array} names The items that needs to be removed
 * @public
 */
assign('multiRemove', async function multiRemove(names) {
  return names.map(name => internal.delete(name));
});

/**
 * Get all keys.
 *
 * @returns {Array} All known keys.
 * @public
 */
assign('getAllKeys', async function getAllKeys() {
  const iterator = internal.keys();
  const result = [];

  for (const key of iterator) result.push(key);

  return result;
});

/**
 * Remove all stored items.
 *
 * @public
 */
assign('clear', async function clear() {
  return internal.clear();
});

/**
 * Does nothing, because we don't have batched operations so just void it.
 *
 * @public
 */
assign('flushGetRequests', async function flushGetRequests() {});

//
// Expose the API
//
module.exports = AsyncStorage;
