import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MdCode, MdCheckbox, MdList, MdImage } from './md'
import { parseMarkdownContent } from './mdHelpers'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>({})
  const [animatingCheckboxes, setAnimatingCheckboxes] = useState<Set<string>>(new Set())
  const [hasAnimated, setHasAnimated] = useState(false)
  const contentRef = useRef<string>(content)

  const toggleCheckbox = (id: string) => {
    setCheckboxStates(prev => {
      const newState = !prev[id]
      
      // Add animation if becoming checked
      if (newState) {
        setAnimatingCheckboxes(current => new Set([...current, id]))
        setTimeout(() => {
          setAnimatingCheckboxes(current => {
            const newSet = new Set(current)
            newSet.delete(id)
            return newSet
          })
        }, 400)
      }
      
      return {
        ...prev,
        [id]: newState
      }
    })
  }

  // Track content changes to determine when to animate
  useEffect(() => {
    if (contentRef.current !== content) {
      contentRef.current = content
      setHasAnimated(false)
      // Clear checkbox states when content changes
      setCheckboxStates({})
    }
  }, [content])

  // Mark as animated after first render
  useEffect(() => {
    if (!hasAnimated) {
      const timer = setTimeout(() => setHasAnimated(true), 100)
      return () => clearTimeout(timer)
    }
  }, [hasAnimated])

  const parsedElements = useMemo(() => parseMarkdownContent(content), [content])

  const renderInlineContent = (text: string) => {
    // Process in order: bold first, then italic (since bold uses ** and italic uses *)
    // Bold text - match **text** and replace with <strong> without showing the asterisks
    let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    
    // Italic text - Simple approach: replace single * that isn't preceded or followed by another *
    // Split by existing <strong> tags to avoid affecting already processed bold text
    const parts = processed.split(/(<strong[^>]*>.*?<\/strong>)/g)
    processed = parts.map(part => {
      if (part.includes('<strong')) {
        return part // Don't process parts that contain bold tags
      }
      return part.replace(/\*([^*\n]+?)\*/g, '<em class="italic">$1</em>')
    }).join('')
    
    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">$1</code>')
    
    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:text-accent underline transition-colors" target="_blank" rel="noopener noreferrer">$1</a>')
    
    return <span dangerouslySetInnerHTML={{ __html: processed }} />
  }

  // Animation variants for smooth content transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        mass: 0.8
      }
    }
  }

  return (
    <motion.div 
      className="prose prose-gray max-w-none"
      variants={containerVariants}
      initial={hasAnimated ? false : "hidden"}
      animate={hasAnimated ? false : "visible"}
      key={`content-${contentRef.current.slice(0, 50)}`} // Only change key when content actually changes
    >
      <AnimatePresence mode="wait">
        {parsedElements.map((element, index) => {
          const MotionWrapper = ({ children }: { children: React.ReactNode }) => (
            <motion.div 
              variants={hasAnimated ? {} : itemVariants}
              initial={hasAnimated ? false : "hidden"}
              animate={hasAnimated ? false : "visible"}
            >
              {children}
            </motion.div>
          )

          switch (element.type) {
            case 'header':
              const headerClasses = {
                1: 'text-3xl font-bold text-foreground mb-6 mt-0',
                2: 'text-2xl font-bold text-foreground mb-6 mt-10',
                3: 'text-xl font-semibold text-foreground mb-4 mt-8'
              }
              const HeaderElement = element.level === 1 ? 'h1' : element.level === 2 ? 'h2' : 'h3'
              return (
                <MotionWrapper key={index}>
                  <HeaderElement className={headerClasses[element.level as keyof typeof headerClasses]}>
                    {element.content}
                  </HeaderElement>
                </MotionWrapper>
              )

            case 'code':
              return (
                <MotionWrapper key={index}>
                  <MdCode 
                    content={element.content}
                    language={element.language || 'javascript'}
                    index={index}
                  />
                </MotionWrapper>
              )

            case 'checkbox':
              const isChecked = checkboxStates[element.id!] ?? element.checked
              const isAnimating = animatingCheckboxes.has(element.id!)
              return (
                <MotionWrapper key={index}>
                  <MdCheckbox
                    content={element.content}
                    checked={element.checked}
                    id={element.id!}
                    renderInlineContent={renderInlineContent}
                    onToggle={toggleCheckbox}
                    isChecked={isChecked}
                    isAnimating={isAnimating}
                  />
                </MotionWrapper>
              )

            case 'list':
              return (
                <MotionWrapper key={index}>
                  <MdList
                    content={element.content}
                    renderInlineContent={renderInlineContent}
                  />
                </MotionWrapper>
              )

            case 'aside':
              return (
                <MotionWrapper key={index}>
                  <div className="my-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                        <span className="text-blue-600 text-sm font-semibold">💡</span>
                      </div>
                      <div className="text-blue-800 space-y-2 flex-1">
                        {element.content.split('\n').map((line, lineIndex) => {
                          const trimmedLine = line.trim()
                          if (!trimmedLine) return null
                          
                          // Handle headers within aside blocks - remove the ### and ** formatting
                          if (trimmedLine.startsWith('###')) {
                            const headerText = trimmedLine.replace(/^### /, '').replace(/^\*\*(.*?)\*\*$/, '$1')
                            return (
                              <h4 key={lineIndex} className="font-semibold text-blue-900 text-lg mb-2 mt-1">
                                {headerText}
                              </h4>
                            )
                          }
                          
                          return (
                            <p key={lineIndex} className="leading-relaxed">
                              {renderInlineContent(trimmedLine)}
                            </p>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </MotionWrapper>
              )

            case 'divider':
              return (
                <MotionWrapper key={index}>
                  <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </MotionWrapper>
              )

            case 'image':
              return (
                <MotionWrapper key={index}>
                  <MdImage 
                    content={element.content}
                    alt={element.alt}
                  />
                </MotionWrapper>
              )

            case 'paragraph':
              return (
                <MotionWrapper key={index}>
                  <p className="text-foreground leading-relaxed mb-4">
                    {renderInlineContent(element.content)}
                  </p>
                </MotionWrapper>
              )

            default:
              return null
          }
        })}
      </AnimatePresence>
    </motion.div>
  )
}