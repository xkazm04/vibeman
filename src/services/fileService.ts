/**
 * File service for reading files from the file system
 */
export class FileService {
  /**
   * Read a single file from the file system
   */
  static async readFile(filePath: string): Promise<string> {
    try {
      // In a real implementation, this would use Node.js fs or a file API
      // For now, we'll simulate reading files
      const response = await fetch('/api/files/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });

      if (!response.ok) {
        throw new Error(`Failed to read file: ${filePath}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read multiple files from the file system
   */
  static async readFiles(filePaths: string[]): Promise<Record<string, string>> {
    const fileContents: Record<string, string> = {};
    
    // Read files in parallel for better performance
    const readPromises = filePaths.map(async (filePath) => {
      try {
        const content = await this.readFile(filePath);
        return { filePath, content };
      } catch (error) {
        console.warn(`Failed to read file: ${filePath}`, error);
        return { filePath, content: `// Failed to read file: ${filePath}` };
      }
    });

    const results = await Promise.all(readPromises);
    
    results.forEach(({ filePath, content }) => {
      fileContents[filePath] = content;
    });

    return fileContents;
  }

  /**
   * Check if a file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const response = await fetch('/api/files/exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });

      return response.ok;
    } catch (error) {
      console.error(`Error checking file existence: ${filePath}`, error);
      return false;
    }
  }
}