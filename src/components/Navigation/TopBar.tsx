'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, MoreHorizontal, BookOpen, Wand2, Component, ShoppingBag, Activity, Users, Sunrise } from 'lucide-react';
import { useOnboardingStore, type AppModule } from '@/stores/onboardingStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import UnifiedProjectSelector from './UnifiedProjectSelector';

interface NavigationItem {
  module: AppModule;
  label: string;
  icon?: React.ElementType;
}

// Main navigation items (visible in top bar)
const mainNavigationItems: NavigationItem[] = [
  { module: 'coder', label: 'Project' },
  { module: 'contexts', label: 'Contexts' },
  { module: 'ideas', label: 'Ideas' },
  { module: 'tinder', label: 'Tinder' },
  { module: 'tasker', label: 'Tasker' },
  { module: 'manager', label: 'Manager' },
  { module: 'social', label: 'Social', icon: Users },
];

// Hidden in "Other" dropdown
const otherNavigationItems: NavigationItem[] = [
  { module: 'composer', label: 'BP Composer', icon: Wand2 },
  { module: 'reflector', label: 'Reflector', icon: Activity },
  { module: 'zen', label: 'Zen Mode', icon: Sunrise },
  { module: 'docs', label: 'Docs', icon: BookOpen },
  { module: 'refactor', label: 'Wizard', icon: Wand2 },
  { module: 'storybook', label: 'Storybook', icon: Component },
];

// Navigation item component
interface NavItemProps {
  item: NavigationItem;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

function NavItem({ item, index, isActive, onClick }: NavItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="relative"
    >
      <button
        onClick={onClick}
        className="group relative px-4 py-2 text-sm font-light tracking-wide transition-all duration-300"
        title={`${item.label} (Ctrl+${index + 1})`}
        data-testid={`nav-item-${item.module}`}
      >
        <span
          className={`relative z-10 transition-all duration-300 ${isActive
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
        <div className={`absolute inset-0 rounded-lg transition-all duration-300 ${isActive
            ? 'shadow-lg shadow-purple-500/20'
            : 'group-hover:shadow-md group-hover:shadow-white/10'
          }`} />
      </button>
    </motion.div>
  );
}

// Other dropdown component
function OtherDropdown({
  items,
  activeModule,
  onSelect,
  startIndex,
}: {
  items: NavigationItem[];
  activeModule: AppModule;
  onSelect: (module: AppModule) => void;
  startIndex: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if any item in "Other" is active
  const isOtherActive = items.some(item => item.module === activeModule);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: startIndex * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      className="relative"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative px-4 py-2 text-sm font-light tracking-wide transition-all duration-300 flex items-center gap-1.5`}
        data-testid="nav-other-dropdown"
      >
        <span className={`relative z-10 transition-all duration-300 ${
          isOtherActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
        }`}>
          Other
        </span>
        <MoreHorizontal className={`w-4 h-4 transition-all duration-300 ${
          isOtherActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
        }`} />

        {/* Active indicator */}
        {isOtherActive && (
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
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Panel */}
            <motion.div
              className="absolute top-full right-0 mt-2 z-50 min-w-[180px] rounded-lg border border-gray-700/50 bg-gray-900/95 backdrop-blur-xl shadow-xl overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.module;

                return (
                  <button
                    key={item.module}
                    onClick={() => {
                      onSelect(item.module);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-purple-900/40 text-white'
                        : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                    }`}
                    data-testid={`nav-other-${item.module}`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Marketplace in dropdown */}
              <div className="border-t border-gray-700/50">
                <MarketplaceDropdownItem />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Marketplace item for dropdown
function MarketplaceDropdownItem() {
  const { openModal: openMarketplace } = useMarketplaceStore();

  return (
    <button
      onClick={openMarketplace}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 transition-colors"
      data-testid="nav-other-marketplace"
    >
      <Store className="w-4 h-4" />
      <span>Marketplace</span>
    </button>
  );
}

export default function TopBar() {
  const { activeModule, setActiveModule } = useOnboardingStore();

  // Modules that should NOT show the project selector
  const modulesWithoutProjectSelector: AppModule[] = ['reflector', 'social', 'zen'];
  const showProjectSelector = !modulesWithoutProjectSelector.includes(activeModule);

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-center">
            {/* Module Navigation */}
            <div className="flex items-center space-x-6">
              {mainNavigationItems.map((item, index) => (
                <NavItem
                  key={item.module}
                  item={item}
                  index={index}
                  isActive={activeModule === item.module}
                  onClick={() => setActiveModule(item.module)}
                />
              ))}

              {/* Other Dropdown */}
              <OtherDropdown
                items={otherNavigationItems}
                activeModule={activeModule}
                onSelect={setActiveModule}
                startIndex={mainNavigationItems.length}
              />
            </div>
          </nav>
        </div>

        {/* Subtle gradient line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </motion.header>

      {/* Unified Project Selector - Conditionally rendered */}
      {showProjectSelector && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-16 left-0 right-0 z-40 overflow-hidden"
        >
          <UnifiedProjectSelector />
        </motion.div>
      )}
    </>
  );
}
