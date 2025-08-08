import { useState } from 'react'
import { X } from 'lucide-react'

interface MdImageProps {
  content: string // URL
  alt?: string
}

export function MdImage({ content, alt }: MdImageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageClick = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleModalClick = (e: React.MouseEvent) => {
    // Close modal when clicking on backdrop
    if (e.target === e.currentTarget) {
      handleCloseModal()
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  if (imageError) {
    return (
      <div className="my-8">
        <div className="flex flex-col items-center justify-center h-32 bg-muted rounded-lg border border-border">
          <span className="text-muted-foreground text-sm">Failed to load image</span>
          <span className="text-muted-foreground text-xs mt-1 opacity-70">Check the URL or try refreshing</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="my-8">
        <div className="relative w-full max-w-5xl mx-auto">
                      <img
            src={content}
            alt={alt || 'Tutorial image'}
            className="w-full h-auto rounded-lg shadow-lg border border-border object-contain max-h-[50vh] bg-white/50 cursor-pointer hover:shadow-xl transition-shadow duration-300"
            loading="lazy"
            style={{
              maxWidth: '70%', // Reduced more to make modal enlargement more noticeable
              height: 'auto',
              margin: '0 auto',
              display: 'block'
            }}
            onClick={handleImageClick}
            onError={handleImageError}
            title="Click to enlarge"
          />
          {alt && (
            <p className="text-center text-sm text-muted-foreground mt-3 italic">
              {alt}
            </p>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleModalClick}
        >
          <div className="relative max-w-[98vw] max-h-[98vh] overflow-auto flex items-center justify-center">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors duration-200"
              title="Close"
            >
              <X size={24} />
            </button>
            <img
              src={content}
              alt={alt || 'Tutorial image'}
              className="rounded-lg shadow-2xl object-contain"
              style={{
                maxWidth: '95vw',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto'
              }}
            />
            {alt && (
              <p className="text-center text-sm text-white/80 mt-4 italic">
                {alt}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
} 