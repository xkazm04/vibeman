/**
 * Tool type definitions for Annette tools
 */

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  items?: ToolParameter;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute?: (params: any) => Promise<unknown>;
}
