import type { LanguageServer, LanguageServerList } from '@/src/lib/language-server-gateway.ts'

const server = (
  values: Pick<LanguageServer, 'id' | 'version' | 'languages' | 'fileTypes' | 'description'> &
    Partial<LanguageServer>,
): LanguageServer => {
  return {
    homepage: '',
    requires: [],
    missing: [],
    outdated: [],
    available: true,
    status: 'not-installed',
    progress: null,
    installedVersion: '',
    updateAvailable: false,
    error: '',
    ...values,
  }
}

export const languageServerList: LanguageServerList = {
  platform: 'linux-arm64-gnu',
  fileTypes: {
    c: { extensions: ['c', 'h'], filenames: [], server: 'clangd' },
    cpp: {
      extensions: ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'ipp', 'tpp'],
      filenames: [],
      server: 'clangd',
    },
    csharp: { extensions: ['cs', 'csx'], filenames: [], server: 'omnisharp' },
    go: { extensions: ['go'], filenames: [], server: 'gopls' },
    'go.mod': { extensions: [], filenames: ['go.mod'], server: 'gopls' },
    'go.work': { extensions: [], filenames: ['go.work'], server: 'gopls' },
    java: { extensions: ['java'], filenames: [], server: 'jdtls' },
    javascript: {
      extensions: ['js', 'mjs', 'cjs'],
      filenames: [],
      server: 'typescript-language-server',
    },
    javascriptreact: { extensions: ['jsx'], filenames: [], server: 'typescript-language-server' },
    kotlin: { extensions: ['kt', 'kts'], filenames: [], server: 'kotlin-language-server' },
    lua: { extensions: ['lua'], filenames: [], server: 'lua-language-server' },
    php: { extensions: ['php', 'phtml'], filenames: [], server: 'intelephense' },
    python: { extensions: ['py', 'pyi'], filenames: [], server: 'pyright' },
    rust: { extensions: ['rs'], filenames: [], server: 'rust-analyzer' },
    shellscript: {
      extensions: ['sh', 'bash'],
      filenames: ['.bashrc', '.bash_profile', '.bash_aliases', '.profile'],
      server: 'bash-language-server',
    },
    typescript: {
      extensions: ['ts', 'mts', 'cts'],
      filenames: [],
      server: 'typescript-language-server',
    },
    typescriptreact: { extensions: ['tsx'], filenames: [], server: 'typescript-language-server' },
    zig: { extensions: ['zig', 'zon'], filenames: [], server: 'zls' },
  },
  servers: [
    server({
      id: 'bash-language-server',
      version: '5.8.1',
      languages: ['Bash', 'Csh', 'Ksh', 'Sh', 'Zsh'],
      fileTypes: ['shellscript'],
      requires: ['node', 'npm'],
      description: 'A language server for Bash.',
    }),
    server({
      id: 'clangd',
      version: '23.1.0',
      languages: ['C', 'C++'],
      fileTypes: ['c', 'cpp'],
      available: false,
      description:
        'clangd understands your C++ code and adds smart features to your editor: code completion, compile errors, go-to-definition and more.',
    }),
    server({
      id: 'gopls',
      version: 'v0.23.0',
      languages: ['Go'],
      fileTypes: ['go', 'go.mod', 'go.work'],
      requires: ['go'],
      status: 'installed',
      installedVersion: 'v0.23.0',
      description:
        'gopls (pronounced "Go please") is the official Go language server developed by the Go team.',
    }),
    server({
      id: 'intelephense',
      version: '1.18.5',
      languages: ['PHP'],
      fileTypes: ['php'],
      requires: ['node', 'npm'],
      status: 'failed',
      error:
        'npm install: exit status 1\nnpm error code ECONNRESET\nnpm error network aborted while fetching https://registry.npmjs.org/intelephense',
      description: 'Professional PHP tooling for any Language Server Protocol capable editor.',
    }),
    server({
      id: 'jdtls',
      version: 'v1.62.0',
      languages: ['Java'],
      fileTypes: ['java'],
      requires: ['java', 'python3'],
      missing: ['java'],
      outdated: [{ tool: 'java', minimum: '21', found: '17' }],
      description: 'Java language server.',
    }),
    server({
      id: 'kotlin-language-server',
      version: '1.3.13',
      languages: ['Kotlin'],
      fileTypes: ['kotlin'],
      requires: ['java'],
      missing: ['java'],
      description:
        'Kotlin code completion, linting and more for any editor using the Language Server Protocol.',
    }),
    server({
      id: 'lua-language-server',
      version: '3.19.2',
      languages: ['Lua'],
      fileTypes: ['lua'],
      description: 'A language server that offers Lua language support, programmed in Lua.',
    }),
    server({
      id: 'omnisharp',
      version: 'v1.39.15',
      languages: ['C#'],
      fileTypes: ['csharp'],
      requires: ['dotnet'],
      missing: ['dotnet'],
      description: 'OmniSharp language server based on Roslyn workspaces. Requires .NET 6.0.',
    }),
    server({
      id: 'pyright',
      version: '1.1.414',
      languages: ['Python'],
      fileTypes: ['python'],
      requires: ['node', 'npm'],
      status: 'installed',
      installedVersion: '1.1.400',
      updateAvailable: true,
      description: 'Static type checker for Python.',
    }),
    server({
      id: 'rust-analyzer',
      version: '2026-10-19',
      languages: ['Rust'],
      fileTypes: ['rust'],
      description: 'rust-analyzer is an implementation of the Language Server Protocol for Rust.',
    }),
    server({
      id: 'typescript-language-server',
      version: '6.0.2',
      languages: ['TypeScript', 'JavaScript'],
      fileTypes: ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'],
      requires: ['node', 'npm'],
      description: 'TypeScript & JavaScript Language Server.',
    }),
    server({
      id: 'zls',
      version: '0.16.1',
      languages: ['Zig'],
      fileTypes: ['zig'],
      description: 'Zig LSP implementation and Zig Language Server.',
    }),
  ],
}

export const languageServerById = (id: string) => {
  const server = languageServerList.servers.find((candidate) => {
    return candidate.id === id
  })
  if (!server) {
    throw new Error(`unknown language server ${id}`)
  }
  return server
}

export const withLanguageServer = (
  id: string,
  values: Partial<LanguageServer>,
): LanguageServerList => {
  return {
    ...languageServerList,
    servers: languageServerList.servers.map((server) => {
      return server.id === id ? { ...server, ...values } : server
    }),
  }
}

export const installingProgress = { received: 6_200_000, total: 18_400_000 }
