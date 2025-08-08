interface MdCheckboxProps {
  content: string
  checked?: boolean
  id: string
  renderInlineContent: (text: string) => React.ReactElement
  onToggle: (id: string) => void
  isChecked: boolean
  isAnimating: boolean
}

export function MdCheckbox({ content, id, renderInlineContent, onToggle, isChecked, isAnimating }: MdCheckboxProps) {
  return (
    <div className="flex items-center gap-3 my-3 group">
      <div className="relative checkbox-wrapper">
        <input
          type="checkbox"
          id={id}
          checked={isChecked}
          onChange={() => onToggle(id)}
          autoComplete="off"
          className="sr-only"
        />
        <label 
          htmlFor={id}
          className={`
            w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer
            transition-all duration-300 ease-out hover:scale-110 active:scale-95
            checkbox-focus relative overflow-hidden
            ${isChecked 
              ? 'bg-primary border-primary shadow-lg shadow-primary/25 ring-2 ring-primary/20' 
              : 'border-border hover:border-primary/60 bg-background hover:bg-primary/5 hover:shadow-sm'
            }
          `}
        >
          {/* Ripple effect background */}
          <div className={`
            absolute inset-0 bg-white/20 rounded-md scale-0 
            transition-transform duration-200 ease-out
            ${isAnimating ? 'scale-150' : ''}
          `} />
          
          <svg 
            className={`w-3 h-3 text-white transition-all duration-300 relative z-10 ${
              isChecked ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            } ${isAnimating ? 'checkbox-check-animate' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={3} 
              d="M5 13l4 4L19 7"
            />
          </svg>
        </label>
      </div>
      <label 
        htmlFor={id}
        className={`text-foreground cursor-pointer transition-all duration-300 select-none ${
          isChecked ? 'line-through opacity-70' : 'group-hover:text-primary/80'
        }`}
      >
        {renderInlineContent(content)}
      </label>
    </div>
  )
} 