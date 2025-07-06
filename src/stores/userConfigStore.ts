import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserConfig {
  basePath: string;
  useBasePath: boolean;
}

interface UserConfigStore extends UserConfig {
  // Actions
  setBasePath: (path: string) => void;
  setUseBasePath: (use: boolean) => void;
  resetToDefaults: () => void;
}

const defaultConfig: UserConfig = {
  basePath: 'C:\\Users\\kazda\\mk',
  useBasePath: true,
};

export const useUserConfigStore = create<UserConfigStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultConfig,
        
        setBasePath: (path: string) => {
          set({ basePath: path });
        },
        
        setUseBasePath: (use: boolean) => {
          set({ useBasePath: use });
        },
        
        resetToDefaults: () => {
          set(defaultConfig);
        },
      }),
      {
        name: 'user-config-store',
        version: 1,
      }
    )
  )
);

export default useUserConfigStore; 