// Shared types for Advisor components

export interface AdvisorRecommendation {
  title: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
  files?: string[];
}

export interface AdvisorVulnerability {
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  fix?: string;
  files?: string[];
}

export interface AdvisorImprovement {
  title: string;
  description: string;
  pattern?: string;
  files?: string[];
}

export interface AdvisorOpportunity {
  title: string;
  description: string;
  impact?: string;
}

export interface AdvisorIdea {
  title: string;
  description: string;
  feasibility?: 'high' | 'medium' | 'wild';
}

export interface AdvisorIssue {
  issue?: string;
  title?: string;
  suggestion?: string;
  file?: string;
}

export interface UXResponseData {
  summary?: string;
  recommendations?: AdvisorRecommendation[];
  moonshot?: string;
}

export interface SecurityResponseData {
  riskAssessment?: string;
  vulnerabilities?: AdvisorVulnerability[];
  performanceOptimization?: string;
}

export interface ArchitectResponseData {
  overview?: string;
  improvements?: AdvisorImprovement[];
  vision?: string;
}

export interface VisionaryResponseData {
  bigPicture?: string;
  opportunities?: AdvisorOpportunity[];
  boldVision?: string;
}

export interface ChumResponseData {
  enthusiasm?: string;
  ideas?: AdvisorIdea[];
  audaciousIdea?: string;
}

export interface GenericResponseData {
  issues?: AdvisorIssue[];
  recommendations?: AdvisorRecommendation[];
}

export interface RawMarkdownResponseData {
  _raw: boolean;
  _markdown: string;
}

export type AdvisorResponseData =
  | UXResponseData
  | SecurityResponseData
  | ArchitectResponseData
  | VisionaryResponseData
  | ChumResponseData
  | GenericResponseData
  | RawMarkdownResponseData;
