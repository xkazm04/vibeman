import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { List, ChevronRight } from 'lucide-react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: TOCItem[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0% -35% 0%',
        threshold: 0
      }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 200;
      setIsVisible(scrolled);
    };

    // Show TOC immediately if there are headings
    if (headings.length > 0) {
      setIsVisible(true);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (headings.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.3 }}
          className="fixed right-6 top-1/2 transform -translate-y-1/2 z-[100]"
        >
          <div
            className={`bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
              isExpanded ? 'w-64' : 'w-12'
            }`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
          >
            {/* Toggle Button */}
            <div className="p-3 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <List className="w-5 h-5 text-gray-400" />
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-gray-300 font-medium"
                  >
                    Contents
                  </motion.span>
                )}
              </div>
            </div>

            {/* TOC Items */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-96 overflow-y-auto py-2"
                >
                  {headings.map((heading, index) => (
                    <motion.button
                      key={heading.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => scrollToHeading(heading.id)}
                      className={`
                        w-full text-left px-3 py-2 text-sm transition-all duration-200
                        hover:bg-gray-800/50 hover:text-white
                        ${activeId === heading.id 
                          ? 'text-cyan-400 bg-cyan-500/10 border-r-2 border-cyan-400' 
                          : 'text-gray-400'
                        }
                      `}
                      style={{ paddingLeft: `${0.75 + (heading.level - 1) * 0.5}rem` }}
                    >
                      <div className="flex items-center space-x-2">
                        {heading.level > 1 && (
                          <ChevronRight className="w-3 h-3 opacity-50" />
                        )}
                        <span className="truncate">{heading.text}</span>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}