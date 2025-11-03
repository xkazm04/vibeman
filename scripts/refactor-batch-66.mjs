import fs from 'fs/promises';
import path from 'path';

const projectRoot = process.cwd();

async function refactorFile(filePath, refactorFn) {
  try {
    const fullPath = path.join(projectRoot, filePath);
    let content = await fs.readFile(fullPath, 'utf-8');
    content = refactorFn(content);
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`✓ Refactored: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to refactor ${filePath}:`, error.message);
    return false;
  }
}

// Refactoring functions
const refactorImplementationLogList = (content) => {
  // Remove console.error statements
  content = content.replace(/\s*console\.error\(['"]Error fetching implementation logs:['"], err\);?\n?/g, '');
  content = content.replace(/\s*console\.error\(['"]Error updating log:['"], err\);?\n?/g, '');

  // Extract StatusBadge component
  const statusBadgeComponent = `
// Helper component for status badge
const StatusBadge = ({ untestedCount, logsLength }: { untestedCount: number; logsLength: number }) => {
  if (untestedCount > 0) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg"
      >
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-medium text-amber-400">
          {untestedCount} Untested
        </span>
      </motion.div>
    );
  }

  if (logsLength > 0) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs font-medium text-green-400">
          All Tested
        </span>
      </motion.div>
    );
  }

  return null;
};
`;

  // Insert StatusBadge before the main component
  content = content.replace(
    /export default function ImplementationLogList/,
    statusBadgeComponent + '\nexport default function ImplementationLogList'
  );

  // Replace the duplicate badge rendering with component
  content = content.replace(
    /\s*{\/\* Untested Count Badge \*\/}[\s\S]*?{\/\* All Tested Badge \*\/}[\s\S]*?<\/motion\.div>\s*\)\s*\}\s*}/,
    '\n\n        <StatusBadge untestedCount={untestedCount} logsLength={logs.length} />'
  );

  return content;
};

const refactorScanContext = (content) => {
  // Remove console.error statement
  content = content.replace(/\s*console\.error\(['"]Scan failed:['"], error\);?\n?/g, '');

  return content;
};

const refactorContextOverview = (content) => {
  // Remove console.error statements
  content = content.replace(/\s*console\.error\([`'"]Failed to load file \$\{filePath\}:['"], error\);?\n?/g, '');
  content = content.replace(/\s*console\.error\(['"]Error loading file contents:['"], error\);?\n?/g, '');
  content = content.replace(/\s*console\.error\(['"]Failed to refresh context:['"], error\);?\n?/g, '');

  return content;
};

// Main execution
async function main() {
  console.log('Starting Refactor Batch 66...\n');

  const results = [];

  // Refactor ImplementationLogList.tsx
  results.push(await refactorFile(
    'src/app/features/Goals/sub_ImplementationLog/ImplementationLogList.tsx',
    refactorImplementationLogList
  ));

  // Refactor ScanContext.tsx
  results.push(await refactorFile(
    'src/app/features/Depndencies/lib/ScanContext.tsx',
    refactorScanContext
  ));

  // Refactor ContextOverview.tsx
  results.push(await refactorFile(
    'src/app/features/Context/sub_ContextOverview/ContextOverview.tsx',
    refactorContextOverview
  ));

  const successCount = results.filter(Boolean).length;
  console.log(`\n✓ Completed ${successCount}/${results.length} refactorings`);
}

main().catch(console.error);
