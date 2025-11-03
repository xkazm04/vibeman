/**
 * PlantUML encoding utilities for browser-based rendering
 */

export interface PlantUMLEncodingResult {
  url: string;
  method: string;
  success?: boolean;
}

/**
 * Encode PlantUML content using hex encoding (most reliable for complex diagrams)
 */
export function encodePlantUMLHex(content: string): string {
  const utf8Bytes = new TextEncoder().encode(content);
  let hex = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    hex += utf8Bytes[i].toString(16).padStart(2, '0');
  }
  return `https://www.plantuml.com/plantuml/svg/~h${hex}`;
}

/**
 * Encode PlantUML content using URL encoding with text prefix
 */
export function encodePlantUMLText(content: string): string {
  const encoded = encodeURIComponent(content);
  return `https://www.plantuml.com/plantuml/svg/~1${encoded}`;
}

/**
 * Encode PlantUML content using base64 (fallback method)
 */
export function encodePlantUMLBase64(content: string): string {
  const encoded = btoa(unescape(encodeURIComponent(content)));
  return `https://www.plantuml.com/plantuml/svg/${encoded}`;
}

/**
 * Get all available encoding methods for PlantUML
 */
export function getPlantUMLEncodingMethods(content: string): PlantUMLEncodingResult[] {
  return [
    {
      url: encodePlantUMLHex(content),
      method: 'Hex Encoding (~h prefix)'
    },
    {
      url: encodePlantUMLText(content),
      method: 'Text Encoding (~1 prefix)'
    },
    {
      url: encodePlantUMLBase64(content),
      method: 'Base64 Encoding'
    },
    {
      url: encodePlantUMLHex(content).replace('/svg/', '/png/'),
      method: 'Hex Encoding PNG format'
    }
  ];
}

/**
 * Test if a PlantUML URL is accessible
 */
export function testPlantUMLUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout after 10 seconds
    setTimeout(() => resolve(false), 10000);
  });
}

/**
 * Find the best working encoding method for PlantUML content
 */
export async function findBestPlantUMLEncoding(content: string): Promise<PlantUMLEncodingResult | null> {
  const methods = getPlantUMLEncodingMethods(content);

  for (const method of methods) {
    const success = await testPlantUMLUrl(method.url);
    if (success) {
      return { ...method, success: true };
    }
  }

  return null;
}