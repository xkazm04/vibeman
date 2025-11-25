/**
 * Code duplication detection patterns
 */

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
}

/**
 * Normalizes code by removing whitespace, comments, and variable names
 * This allows detecting structurally similar code even with different names
 */
function normalizeCodeBlock(code: string): string {
  return code
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove string contents (keep quotes to maintain structure)
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/`[^`]*`/g, '``')
    .trim();
}

/**
 * Calculates Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  // Create character n-grams (size 3) for better similarity detection
  const getNGrams = (str: string, n: number = 3): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      grams.add(str.slice(i, i + n));
    }
    return grams;
  };

  const grams1 = getNGrams(str1);
  const grams2 = getNGrams(str2);

  // Calculate intersection
  const intersection = new Set([...grams1].filter(x => grams2.has(x)));

  // Calculate union
  const union = new Set([...grams1, ...grams2]);

  return intersection.size / union.size;
}

/**
 * Detects duplicated code patterns with improved similarity detection
 * Uses both exact matching and structural similarity
 */
export function detectDuplication(content: string): number[] {
  const lines = splitLines(content);
  const duplicates: number[] = [];
  const minBlockSize = 5; // Increased from 3 for more meaningful duplicates
  const similarityThreshold = 0.85; // 85% similar = duplicate

  interface CodeBlock {
    startLine: number;
    endLine: number;
    code: string;
    normalized: string;
  }

  // Extract all potential code blocks
  const blocks: CodeBlock[] = [];
  for (let i = 0; i < lines.length - minBlockSize; i++) {
    const block = lines.slice(i, i + minBlockSize).join('\n');
    const trimmed = block.trim();

    // Skip blocks that are too small or mostly whitespace/comments
    if (trimmed.length < 100) continue; // Increased from 50 to 100 to reduce noise
    if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) continue;

    blocks.push({
      startLine: i,
      endLine: i + minBlockSize - 1,
      code: block,
      normalized: normalizeCodeBlock(block),
    });
  }

  // Track which blocks we've already marked as duplicates
  const markedDuplicates = new Set<number>();

  // Compare all blocks for similarity
  for (let i = 0; i < blocks.length; i++) {
    if (markedDuplicates.has(i)) continue;

    const block1 = blocks[i];
    let foundDuplicate = false;

    for (let j = i + 1; j < blocks.length; j++) {
      if (markedDuplicates.has(j)) continue;

      const block2 = blocks[j];

      // Check if blocks overlap (skip if they do)
      if (Math.abs(block1.startLine - block2.startLine) < minBlockSize) {
        continue;
      }

      // Check exact match first (fastest)
      if (block1.normalized === block2.normalized) {
        if (!foundDuplicate) {
          duplicates.push(block1.startLine + 1); // +1 for 1-indexed
          markedDuplicates.add(i);
          foundDuplicate = true;
        }
        duplicates.push(block2.startLine + 1);
        markedDuplicates.add(j);
        continue;
      }

      // Check structural similarity
      const similarity = jaccardSimilarity(block1.normalized, block2.normalized);
      if (similarity >= similarityThreshold) {
        if (!foundDuplicate) {
          duplicates.push(block1.startLine + 1);
          markedDuplicates.add(i);
          foundDuplicate = true;
        }
        duplicates.push(block2.startLine + 1);
        markedDuplicates.add(j);
      }
    }
  }

  return duplicates.sort((a, b) => a - b);
}

/**
 * Cross-file duplication detection
 * Finds similar code blocks across multiple files
 */
export interface DuplicationMatch {
  file1: string;
  file2: string;
  line1: number;
  line2: number;
  similarity: number;
  codeBlock: string;
}

export function detectCrossFileDuplication(
  files: Array<{ path: string; content: string }>,
  minBlockSize: number = 5,
  similarityThreshold: number = 0.85
): DuplicationMatch[] {
  const matches: DuplicationMatch[] = [];

  interface FileBlock {
    filePath: string;
    startLine: number;
    code: string;
    normalized: string;
  }

  // Extract blocks from all files
  const allBlocks: FileBlock[] = [];

  for (const file of files) {
    const lines = splitLines(file.content);
    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join('\n');
      const trimmed = block.trim();

      if (trimmed.length < 50) continue;
      if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) continue;

      allBlocks.push({
        filePath: file.path,
        startLine: i + 1,
        code: block,
        normalized: normalizeCodeBlock(block),
      });
    }
  }

  // Compare blocks across files
  const compared = new Set<string>();

  for (let i = 0; i < allBlocks.length; i++) {
    const block1 = allBlocks[i];

    for (let j = i + 1; j < allBlocks.length; j++) {
      const block2 = allBlocks[j];

      // Only compare blocks from different files
      if (block1.filePath === block2.filePath) continue;

      // Create unique key to avoid duplicate comparisons
      const key = `${block1.filePath}:${block1.startLine}-${block2.filePath}:${block2.startLine}`;
      if (compared.has(key)) continue;
      compared.add(key);

      // Check similarity
      let similarity = 0;
      if (block1.normalized === block2.normalized) {
        similarity = 1.0;
      } else {
        similarity = jaccardSimilarity(block1.normalized, block2.normalized);
      }

      if (similarity >= similarityThreshold) {
        matches.push({
          file1: block1.filePath,
          file2: block2.filePath,
          line1: block1.startLine,
          line2: block2.startLine,
          similarity,
          codeBlock: block1.code,
        });
      }
    }
  }

  return matches;
}
