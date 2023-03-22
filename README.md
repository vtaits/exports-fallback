# exports-fallback

Create proxy directories by `exports` field in `package.json` for older environments.

## Parameters

`-g`  Add created directories to .gitignore

`-f`  Write names of created directories to `files` section in `package.json`

`-h`  Show help

## Example

Source `package.json`:

```json
{
  "name": "test",
  "version": "1.0.0",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/index.js",
      "types": "./dist/ts/index.d.ts"
    },
    "./foo": {
      "import": "./dist/esm/foo/index.js",
      "require": "./dist/foo/index.js",
      "types": "./dist/ts/foo/index.d.ts"
    },
    "./bar": {
      "import": "./dist/esm/bar/index.js",
      "require": "./dist/bar/index.js",
      "types": "./dist/ts/bar/index.d.ts"
    },
    "./bar/baz": {
      "import": "./dist/esm/baz/index.js",
      "require": "./dist/baz/index.js",
      "types": "./dist/ts/baz/index.d.ts"
    }
  },
  "files": [
    "/dist"
  ]
}
```

Let's execure `npx exports-fallback -gf`. The result

```
├── package.json
|   bar
|   ├── baz
|   |   └── package.json
|   └── package.json
├── foo
|   └── package.json
└── .gitignore
```

Every created `package.json` will be something like

```
{
  "main": "../../dist/baz/index.js",
  "module": "../../dist/esm/baz/index.js",
  "types": "../../dist/ts/baz/index.d.ts",
  "typings": "../../dist/ts/baz/index.d.ts"
}
```

Some new lines will be added to the root `package.json`:

```
  "files": [
    "/dist",
    "foo",
    "bar"
  ]
```

Script also will create `.gitignore` (or change existed):

```
foo
bar
```
