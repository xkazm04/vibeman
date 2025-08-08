interface MdListProps {
  content: string
  renderInlineContent: (text: string) => React.ReactElement
}

export function MdList({ content, renderInlineContent }: MdListProps) {
  const listItems = content.split('\n')

  return (
    <ul className="list-disc list-inside space-y-1 my-4 ml-4">
      {listItems.map((item, itemIndex) => (
        <li key={itemIndex} className="text-foreground mb-1">
          {renderInlineContent(item)}
        </li>
      ))}
    </ul>
  )
} 