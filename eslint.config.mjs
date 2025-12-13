import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
  },
  // Ban raw console calls in API routes - use logger from @/lib/logger instead
  {
    files: ["src/app/api/**/*.ts", "src/app/api/**/*.tsx"],
    rules: {
      "no-console": ["error", {
        allow: [] // Disallow all console methods in API routes
      }]
    }
  }
];

export default eslintConfig;
