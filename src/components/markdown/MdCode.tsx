import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyIcon, CheckIcon } from 'lucide-react'

interface MdCodeProps {
  content: string
  language: string
  index: number
}

// Custom syntax highlighter theme that matches our design
const customCodeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: '1rem',
    fontSize: '0.875rem',
    lineHeight: '1.5'
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  }
}

export function MdCode({ content, language, index }: MdCodeProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(codeId)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const codeId = `code-${index}`
  const isCopied = copiedCode === codeId

  return (
    <div className="my-6 rounded-lg border border-border bg-card/50 overflow-hidden shadow-sm relative">
      <div className="px-4 py-2 bg-muted/50 border-b border-border text-xs font-mono text-muted-foreground flex justify-between items-center">
        <span>{language}</span>
        <button
          onClick={() => copyToClipboard(content, codeId)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-background/80 border border-border rounded hover:bg-background transition-all duration-200 hover:shadow-sm"
          title={isCopied ? "Copied!" : "Copy code"}
        >
          {isCopied ? (
            <>
              <CheckIcon size={14} className="text-green-600" />
              <span className="text-green-600 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={customCodeTheme}
        customStyle={{
          margin: 0,
          background: 'transparent',
          fontSize: '0.875rem',
          padding: '1rem'
        }}
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
          }
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  )
} 