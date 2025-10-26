'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSmoothNavigation } from '@/hooks/useSmoothNavigation';

interface NavigationItem {
  path: string;
  label: string;
}

const navigationItems: NavigationItem[] = [
  { path: '/', label: 'Home' },
  { path: '/ideas', label: 'Ideas' },
  { path: '/tinder', label: 'Tinder' },
  { path: '/reflector', label: 'Reflector' },
  { path: '/tasker', label: 'Tasker' },
];

export default function TopBar() {
  const pathname = usePathname();
  const { navigateTo, isNavigating } = useSmoothNavigation();

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10 h-16"
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center justify-center">
          <div className="flex items-center space-x-8">
            {navigationItems.map((item, index) => {
              const isActive = pathname === item.path;
              
              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className="relative"
                >
                  <Link
                    href={item.path}
                    onClick={(e) => {
                      if (!isNavigating) {
                        e.preventDefault();
                        navigateTo(item.path);
                      }
                    }}
                    className="group relative px-4 py-2 text-sm font-light tracking-wide transition-all duration-300 block"
                  >
                    <span
                      className={`relative z-10 transition-all duration-300 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-400 group-hover:text-white'
                      }`}
                    >
                      {item.label}
                    </span>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg backdrop-blur-sm"
                        initial={false}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    
                    {/* Hover effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    />
                    
                    {/* Subtle glow effect */}
                    <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${
                      isActive
                        ? 'shadow-lg shadow-purple-500/20'
                        : 'group-hover:shadow-md group-hover:shadow-white/10'
                    }`} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>
      </div>
      
      {/* Subtle gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.header>
  );
}