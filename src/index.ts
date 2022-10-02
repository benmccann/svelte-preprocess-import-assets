import { walk } from 'svelte/compiler'
import { PreprocessorGroup } from 'svelte/types/compiler/preprocess'
import { parse } from 'svelte-parse-markup'
import MagicString from 'magic-string'
import { DEFAULT_SOURCES, DEFAULT_ASSET_PREFIX, IGNORE_FLAG } from './constants'
import type { ImportAssetsOptions, AssetSource, FilterMetadata } from './types'

export { ImportAssetsOptions, AssetSource, FilterMetadata }

export default function importAssets(
  options: ImportAssetsOptions = {}
): PreprocessorGroup {
  let {
    sources = DEFAULT_SOURCES,
    importPrefix = DEFAULT_ASSET_PREFIX,
    http = false,
    urlFilter,
  } = options

  if (typeof sources === 'function') {
    sources = sources(DEFAULT_SOURCES)
  }

  return {
    markup({ content, filename }) {
      const s = new MagicString(content)
      const ast = parse(content, { filename })

      // Import path to import name
      // e.g. ./foo.png => ___ASSET___0
      const imports = new Map<string, string>()

      function addImport(attributeValue: {
        raw: string
        start: number
        end: number
      }) {
        const url = attributeValue.raw.trim()

        // Skip if url points to id, e.g. sprite sheets
        if (url.startsWith('#')) return

        if (!http && /^https?:\/\//.test(url)) return

        if (urlFilter && !urlFilter(url)) return

        let importName = ''

        if (imports.has(url)) {
          importName = imports.get(url)
        } else {
          importName = importPrefix + imports.size
          imports.set(url, importName)
        }

        // e.g. <img src="./foo.png" /> => <img src="{___ASSET___0}" />
        s.overwrite(attributeValue.start, attributeValue.end, `{${importName}}`)
      }

      let ignoreNextElement = false

      walk(ast.html, {
        enter(node: any) {
          if (node.type === 'Comment') {
            if (node.data.trim() === IGNORE_FLAG) {
              ignoreNextElement = true
            }
          } else if (node.type === 'Element') {
            if (ignoreNextElement) {
              ignoreNextElement = false
              return
            }

            let lazyAttributes: Record<string, string> | undefined

            function getAttributes() {
              if (!lazyAttributes) {
                lazyAttributes = {}
                node.attributes.forEach((attr: any) => {
                  // Ensure text only, since text only attribute values will only have one element
                  if (attr.value.length > 1 && attr.value[0].type !== 'Text')
                    return
                  lazyAttributes[attr.name] = attr.value[0].raw
                })
              }
              return lazyAttributes
            }

            for (let i = 0; i < sources.length; i++) {
              const source: AssetSource = sources[i]

              // Compare node tag match
              if (source.tag === node.name) {
                function getAttrValue(attr: string) {
                  const attribute = node.attributes.find((v) => v.name === attr)
                  if (!attribute) return

                  // Ensure value only consists of one element, and is of type "Text".
                  // Which should only match instances of static `foo="bar"` attributes.
                  if (
                    attribute.value.length !== 1 ||
                    attribute.value[0].type !== 'Text'
                  )
                    return

                  if (
                    source.filter &&
                    !source.filter({
                      tag: source.tag,
                      attribute: attr,
                      value: content.slice(attribute.start, attribute.end),
                      attributes: getAttributes(),
                    })
                  )
                    return

                  return attribute.value[0]
                }

                // Check src
                source.srcAttributes?.forEach((attr) => {
                  const value = getAttrValue(attr)
                  if (!value) return
                  addImport(value)
                })

                // Check srcset
                source.srcsetAttributes?.forEach((attr) => {
                  const value = getAttrValue(attr)
                  if (!value) return
                  const srcsetRegex = /\s*([^,\s]+).*?(?:,|$)\s*/gm
                  let match: RegExpExecArray
                  while ((match = srcsetRegex.exec(value.raw))) {
                    addImport({
                      raw: match[1],
                      start: value.start + match.index,
                      end: value.start + match.index + match[1].length,
                    })
                  }
                })
              }
            }
          }
        },
      })

      if (imports.size) {
        let importText = ''
        for (const [path, importName] of imports.entries()) {
          importText += `import ${importName} from "${path}";`
        }
        if (ast.module) {
          s.appendLeft(ast.module.content.start, importText)
        } else if (ast.instance) {
          s.appendLeft(ast.instance.content.start, importText)
        } else {
          s.append(`<script>${importText}</script>`)
        }
      }

      return {
        code: s.toString(),
        map: s.generateMap(),
      }
    },
  }
}
