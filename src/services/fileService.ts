/**
 * File service for reading files from the file system
 */
export class FileService {
  /**
   * Make a POST request to a file API endpoint
   */
  private static async makeFileApiRequest(
    endpoint: string,
    filePath: string
  ): Promise<Response> {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath })
    });
  }

  /**
   * Read a single file from the file system
   */
  static async readFile(filePath: string): Promise<string> {
    const response = await this.makeFileApiRequest('/api/files/read', filePath);

    if (!response.ok) {
      throw new Error(`Failed to read file: ${filePath}`);
    }

    return await response.text();
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
      const response = await this.makeFileApiRequest('/api/files/exists', filePath);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}