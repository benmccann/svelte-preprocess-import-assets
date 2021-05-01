# svelte-preprocess-import-assets

Import assets directly in your markup.

**Convert this:**

```svelte
<h1>Look at this image</h1>
<img src="./assets/cool-image.png" alt="cool image" />
```

**Into this:**

```svelte
<script>
  import __ASSET__0 from './assets/cool-image.png'
</script>

<h1>Look at this image</h1>
<img src={__ASSET__0} alt="cool image" />
```

## Usage

Install with your package manager:

```bash
npm install svelte-preprocess-import-assets
```

Include the preprocessor in your bundler's Svelte plugin `preprocess` option:

```js
import importAssets from 'svelte-preprocess-import-assets'

svelte({ preprocess: [importAssets()] })
```

[Here is more information](https://github.com/sveltejs/svelte-preprocess/blob/9e587151e9384b819d7b285caba7231c138942f0/docs/usage.md) on how to integrate it with your bundler.

## API

The `importAssets()` function receives an optional options object for its first parameter. The object may contain these properties:

### sources

- **Type:** `AssetSource[] | ((defaultSources: AssetSource[]) => AssetSource[])`
- **Default:** See `DEFAULT_SOURCES` in [src/index.ts](./src/index.ts)

  These are the sources to look for when scanning for imports. You can provide an entire different list of sources, or declare a function to access the default sources and augment it.

  ```js
  {
    sources: (defaultSources) => {
      return [
        ...defaultSources,
        // Also scan `data-src` and `data-srcset` of an img tag
        {
          tag: 'img',
          srcAttrs: ['data-src'],
          srcsetAttrs: ['data-srcset'],
        },
      ]
    },
  }
  ```

### importPrefix

- **Type:** `string`
- **Default:** `__ASSET__`

  The string to be prefixed for asset import names, e.g. `__ASSET__0` and `__ASSET__1`.

### urlFilter

- **Type:** `() => boolean`

  Whether a URL should be converted into an import.

  ```js
  {
    // Include URLs with specific extensions only
    urlFilter: (url) => /\.(png|jpg|gif|webp)$/.test(url),
  }
  ```

## Recipes

### Ignore an element

```svelte
<!-- svelte-preprocess-import-assets-ignore -->
<img src="./assets/cool-image.png" alt="cool image" />
```

## License

MIT
