import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier/flat'
import storybook from 'eslint-plugin-storybook'

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/
const HOOK_NAME = /^use[A-Z0-9]/
const CLASS_COMPONENT_BASES = new Set(['Component', 'PureComponent'])

const nameFromDeclarator = (node) =>
  node?.type === 'VariableDeclarator' && node.id.type === 'Identifier' ? node.id.name : null

const resolveFunctionName = (node) => {
  if (node.id?.name) return node.id.name
  const { parent } = node
  if (parent.type === 'CallExpression') return nameFromDeclarator(parent.parent)
  return nameFromDeclarator(parent)
}

const isClassComponent = (node) => {
  const base = node.superClass
  if (!base) return false
  if (base.type === 'Identifier') return CLASS_COMPONENT_BASES.has(base.name)
  return base.type === 'MemberExpression' && CLASS_COMPONENT_BASES.has(base.property.name)
}

const oneComponentPerFile = {
  meta: {
    type: 'problem',
    docs: { description: 'Allow at most one React component definition per file' },
    messages: {
      multiple:
        "Component '{{name}}' must live in its own file. Only one component definition is allowed per file.",
    },
    schema: [],
  },
  create(context) {
    const components = new Map()

    const register = (node, name) => {
      if (!components.has(node)) components.set(node, name)
    }

    const registerRenderingAncestors = (jsxNode) => {
      for (const ancestor of context.sourceCode.getAncestors(jsxNode)) {
        if (!FUNCTION_TYPES.has(ancestor.type)) continue
        const name = resolveFunctionName(ancestor)
        if (name && PASCAL_CASE.test(name)) register(ancestor, name)
      }
    }

    return {
      JSXElement: registerRenderingAncestors,
      JSXFragment: registerRenderingAncestors,
      'ClassDeclaration, ClassExpression'(node) {
        if (isClassComponent(node)) register(node, node.id?.name ?? 'anonymous')
      },
      'Program:exit'() {
        const ordered = [...components].sort(([a], [b]) => a.range[0] - b.range[0])
        for (const [node, name] of ordered.slice(1)) {
          context.report({ node, messageId: 'multiple', data: { name } })
        }
      },
    }
  },
}

const oneHookPerFile = {
  meta: {
    type: 'problem',
    docs: { description: 'Allow at most one custom hook definition per file' },
    messages: {
      multiple:
        "Hook '{{name}}' must live in its own file. Only one hook definition is allowed per file.",
    },
    schema: [],
  },
  create(context) {
    let hookCount = 0

    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
        const name = resolveFunctionName(node)
        if (!name || !HOOK_NAME.test(name)) return
        hookCount += 1
        if (hookCount > 1) context.report({ node, messageId: 'multiple', data: { name } })
      },
    }
  },
}

const overseePlugin = {
  meta: { name: 'oversee' },
  rules: {
    'one-component-per-file': oneComponentPerFile,
    'one-hook-per-file': oneHookPerFile,
  },
}

const inlineAwaitRestriction = {
  selector:
    'AwaitExpression:not(VariableDeclarator > AwaitExpression, AssignmentExpression > AwaitExpression, ExpressionStatement > AwaitExpression)',
  message:
    'Inline await is not allowed. Await on its own statement or assign the result first: `const value = await promise`.',
}

const defaultExportRestrictions = [
  {
    selector: 'ExportDefaultDeclaration',
    message: 'Default exports are not allowed. Use a named export.',
  },
  {
    selector: "ExportSpecifier[exported.name='default']",
    message: 'Default exports are not allowed. Use a named export.',
  },
]

const NON_ASCII_MESSAGE =
  'Non-ASCII characters are not allowed in source text. Use plain ASCII and an icon from react-icons for symbols.'

const nonAsciiRestrictions = [
  { selector: 'Literal[value=/[^\\x00-\\x7F]/]', message: NON_ASCII_MESSAGE },
  { selector: 'TemplateElement[value.raw=/[^\\x00-\\x7F]/]', message: NON_ASCII_MESSAGE },
  { selector: 'JSXText[value=/[^\\x00-\\x7F]/]', message: NON_ASCII_MESSAGE },
]

export default defineConfig([
  globalIgnores(['dist', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { oversee: overseePlugin },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        inlineAwaitRestriction,
        ...defaultExportRestrictions,
        ...nonAsciiRestrictions,
      ],
      'oversee/one-component-per-file': 'error',
      'oversee/one-hook-per-file': 'error',
    },
  },
  storybook.configs['flat/recommended'],
  {
    files: ['*.config.{js,ts}', '**/*.stories.{ts,tsx}', '.storybook/**'],
    rules: {
      'no-restricted-syntax': ['error', inlineAwaitRestriction, ...nonAsciiRestrictions],
    },
  },
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      curly: ['error', 'all'],
      'arrow-body-style': ['error', 'always'],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
])
