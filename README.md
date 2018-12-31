# AsyncStorageApi

The `AsyncStorage` API of React-Native, now backed by a `new Map()` instance,
so it can be ran in any JavaScript environment and as mock for your tests.

## Installation

```
npm install --save asyncstorageapi
```

## Usage

Exactly the same as: https://facebook.github.io/react-native/docs/asyncstorage
With the following exceptions:

- `flushGetRequests` it exists, but does absolutely nothing.

Everything else should work as intended or be considered a bug in this
implementation.

- All methods are truely async.
- Supports Promise and callback based patterns.
- Merging of Objects is done deeply.
- The returned `AsyncStorage` instance is an `object`
- The `AsyncStorage` object only exposes the API methods, nothing more.

## License

MIT
