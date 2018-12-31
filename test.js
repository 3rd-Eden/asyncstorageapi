const { it, describe } = require('mocha');
const AsyncStorage = require('./');
const assume = require('assume');

describe('AsyncStorage', function () {
  it('is a pre-initialized object', function () {
    assume(AsyncStorage).is.a('object');
  });

  describe('#{get|set}Item', function () {
    it('stores the value', async function () {
      await AsyncStorage.setItem('foo', 'bar');

      assume(await AsyncStorage.getItem('foo')).equals('bar');
    });

    it('can only store strings', async function () {
      let failed = false;

      try { await AsyncStorage.setItem('foo', {}) }
      catch (e) { failed = true }

      assume(failed).is.true();
    });

    it('supports callbacks', function (next) {
      AsyncStorage.setItem('foocb', 'cb', (fail) => {
        if (fail) return next(fail);

        AsyncStorage.getItem('foocb', (err, data) => {
          if (err) return next(err);

          assume(data).equals('cb');

          next();
        });
      });
    });

    it('is an async operation', function (next) {
      let values = [];

      AsyncStorage.setItem('async-op', 'stored as last', function (fail) {
        if (fail) return next(fail);

        AsyncStorage.getItem('async-op', function (err, data) {
          if (err) return next(err);

          values.push(data);
          assume(values).deep.equals(['stored first', 'stored as last']);
          next();
        });

        values.push('stored first');
      });
    });
  });

  describe('#mergeItem', function () {
    it('merges with the previous value', async function () {
      await AsyncStorage.setItem('json', JSON.stringify({ foo: 'bar' }));
      await AsyncStorage.mergeItem('json', JSON.stringify({ another: 'value' }));

      const res = JSON.parse(await AsyncStorage.getItem('json'));

      assume(res).is.a('object');
      assume(res).deep.equals({foo: 'bar', another: 'value'});
    });

    it('can deep merge values', async function () {
      await AsyncStorage.setItem('deep', JSON.stringify({ foo: 'bar', deep: { foo: 'bar' } }));
      await AsyncStorage.mergeItem('deep', JSON.stringify({ deep: { foo: 'value' } }));

      const res = JSON.parse(await AsyncStorage.getItem('deep'));

      assume(res).is.a('object');
      assume(res).deep.equals({foo: 'bar', deep: { foo: 'value' }});
    });
  });

  describe('#removeItem', function () {
    it('removes a stored item', async function () {
      await AsyncStorage.setItem('what', 'doing');
      assume(await AsyncStorage.getItem('what')).equals('doing');

      await AsyncStorage.removeItem('what');
      await AsyncStorage.removeItem('this was never added before but shoulnt throw');

      assume(await AsyncStorage.getItem('what')).is.a('null');
    });
  });

  describe('#multiGet', function () {
    it('retrieves multiple items', async function () {
      await AsyncStorage.setItem('foo.1', '1');
      await AsyncStorage.setItem('foo.2', '2');
      await AsyncStorage.setItem('foo.4', '4');

      const pairs = await AsyncStorage.multiGet([
        'foo.1', 'foo.2', 'foo.3', 'foo.4'
      ]);

      assume(pairs).deep.equals([
        ['foo.1', '1'],
        ['foo.2', '2'],
        ['foo.3', null],
        ['foo.4', '4']
      ]);
    });
  });

  describe('#multiSet', function () {
    it('can set multiple key/value pairs', async function () {
      await AsyncStorage.multiSet([
        ['bar.1', '1'],
        ['bar.2', '2'],
        ['bar.3', '3'],
        ['bar.4', '4']
      ]);

      assume(await AsyncStorage.getItem('bar.1')).equals('1');
      assume(await AsyncStorage.getItem('bar.2')).equals('2');
      assume(await AsyncStorage.getItem('bar.3')).equals('3');
      assume(await AsyncStorage.getItem('bar.4')).equals('4');
    });

    it('requires all values to be string', async function () {
      let error = false;

      try {
       await AsyncStorage.multiSet([
         ['bar.1', '1'],
         ['bar.2', { key: 'value' }],
         ['bar.3', '3'],
         ['bar.4', '4']
       ]);
     } catch(e) {
       error = true;
     }

     assume(error).is.true();
   });
  });

  describe('#multiMerge', function () {
    it('merges multiple JSON values deeply', async function () {
      await AsyncStorage.multiSet([
        ['json.1', JSON.stringify({
          foo: 'bar',
          deep: {
            baz: 'boat'
          }
        })],
        ['json.2', JSON.stringify({
          bar: 'foo',
          nested: {
            eat: 'pizza'
          }
        })]
      ]);

      await AsyncStorage.multiMerge([
        ['json.1', JSON.stringify({
          added: true,
          deep: {
            ly: 'added',
            baz: 'overriden'
          },
          must: {
            go: 'deeper'
          }
        })],
        ['json.2', JSON.stringify({
          what: 'is up',
          bar: 'different',
          nested: {
            value: 'is added',
            number: 1
          }
        })]
      ]);

      const pairs = await AsyncStorage.multiGet([ 'json.1', 'json.2' ]);

      //
      // WTF:
      //
      // The keys in the JSON.stringify are ordered by the JavaScript engine.
      // So doing a string based compare can lead to errors, if we JSON parse
      // the stored values we can do a deep assertion that the structure and
      // their values are indeed correct.
      //
      assume(pairs.map((pair) => {
        return [pair[0], JSON.parse(pair[1])]
      })).deep.equals([
        ['json.1', {
          foo: 'bar',
          added: true,
          deep: {
            ly: 'added',
            baz: 'overriden'
          },
          must: {
            go: 'deeper'
          }
        }],
        ['json.2', {
          what: 'is up',
          bar: 'different',
          nested: {
            eat: 'pizza',
            value: 'is added',
            number: 1
          }
        }]
      ]);
    });
  });

  describe('#multiRemove', function () {
    it('removes multiple stored items', async function () {
      await AsyncStorage.multiSet([
        ['remove.1', '1'],
        ['remove.2', '2'],
        ['remove.3', '3'],
        ['remove.4', '4']
      ]);

      await AsyncStorage.multiRemove([
        'remove.1', 'remove.2', 'remove.4'
      ]);

      const pairs = await AsyncStorage.multiGet([
        'remove.1', 'remove.2', 'remove.3', 'remove.4'
      ]);

      assume(pairs).deep.equals([
        ['remove.1', null],
        ['remove.2', null],
        ['remove.3', '3'],
        ['remove.4', null],
      ]);
    });
  });

  describe('#clear', function () {
    it('removes all stored keys', async function () {
      await AsyncStorage.multiSet([
        ['clear.1', '1'],
        ['clear.2', '2'],
        ['clear.3', '3'],
        ['clear.4', '4']
      ]);

      await AsyncStorage.clear();

      const pairs = await AsyncStorage.multiGet([
        'clear.1',
        'clear.2',
        'clear.3',
        'clear.4',
        'deep',
      ]);

      assume(pairs).to.deep.equal([
        ['clear.1', null],
        ['clear.2', null],
        ['clear.3', null],
        ['clear.4', null],
        ['deep', null]
      ]);
    });
  });

  describe('#getAllKeys', function () {
    beforeEach(async function () {
      await AsyncStorage.clear();
    });

    it('returns all keys that are set', async function () {
      await AsyncStorage.setItem('key', 'value');
      await AsyncStorage.setItem('key2', 'value');
      await AsyncStorage.setItem('key3', 'value');
      await AsyncStorage.setItem('key4', 'value');
      await AsyncStorage.setItem('foo', 'bar');

      const keys = await AsyncStorage.getAllKeys();

      assume(keys).is.a('array');
      assume(keys).deep.equals(['key', 'key2', 'key3', 'key4', 'foo']);
    });
  });

  describe('#flushGetRequests', function () {
    it('exists', async function () {
      await AsyncStorage.flushGetRequests();
    });
  });
});
