import type { Node as ProseNode } from '@tiptap/pm/model'
import type { ReactNode } from 'react'
import { CommentMarkdown } from '@/src/lib/comment-markdown.ts'
import { MermaidDiagrams } from '@/src/lib/mermaid-diagrams.ts'
import { MermaidDiagram } from '@/src/components/mermaid-diagram.tsx'

interface CommentCodeBlockProps {
  node: ProseNode
  children?: ReactNode
}

export function CommentCodeBlock({ node, children }: CommentCodeBlockProps) {
  const block = CommentMarkdown.codeBlock(node)

  if (MermaidDiagrams.handles(block.language)) {
    return <MermaidDiagram source={block.text} />
  }
  return (
    <pre>
      <code className={CommentMarkdown.codeClass(block.language)}>{children}</code>
    </pre>
  )
}
