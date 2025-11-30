import Anthropic from '@anthropic-ai/sdk';
import { VulnerabilityInfo } from '@/app/db/models/security-patch.types';

export interface PatchProposal {
  vulnerabilityId: string;
  analysis: string;
  proposal: string;
  minimalChanges: string[];
  riskAssessment: string;
}

/**
 * Generate AI-powered patch proposals for vulnerabilities
 */
export async function generatePatchProposals(
  vulnerabilities: VulnerabilityInfo[],
  projectPath: string
): Promise<PatchProposal[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables');
  }

  const client = new Anthropic({ apiKey });
  const proposals: PatchProposal[] = [];

  // Process vulnerabilities in batches to avoid rate limiting
  for (const vuln of vulnerabilities) {
    try {
      const proposal = await generateSinglePatchProposal(client, vuln, projectPath);
      proposals.push(proposal);
    } catch (error) {
      // Log error and continue with other vulnerabilities
      // TODO: Integrate with proper logging service
      proposals.push({
        vulnerabilityId: vuln.id,
        analysis: `Failed to generate AI analysis: ${error}`,
        proposal: `Update ${vuln.packageName} from ${vuln.currentVersion} to ${vuln.fixedVersion}`,
        minimalChanges: [
          `Update package.json: "${vuln.packageName}": "${vuln.fixedVersion}"`,
          'Run npm install to apply changes'
        ],
        riskAssessment: 'Unable to assess risk due to AI generation failure'
      });
    }
  }

  return proposals;
}

/**
 * Build vulnerability analysis prompt
 */
function buildVulnerabilityPrompt(vuln: VulnerabilityInfo): string {
  return `You are a security expert analyzing a vulnerability in a software project.

**Vulnerability Details:**
- Package: ${vuln.packageName}
- Current Version: ${vuln.currentVersion}
- Fixed Version: ${vuln.fixedVersion}
- Severity: ${vuln.severity}
- Description: ${vuln.description}
${vuln.url ? `- Reference: ${vuln.url}` : ''}

**Your Task:**
1. Analyze the vulnerability and its potential impact
2. Propose minimal changes needed to fix it
3. Assess the risk of applying the fix (breaking changes, compatibility issues)
4. Provide step-by-step instructions

**Response Format (JSON):**
{
  "analysis": "Brief analysis of the vulnerability and its impact",
  "proposal": "Concise patch proposal description",
  "minimalChanges": ["Step 1", "Step 2", ...],
  "riskAssessment": "Assessment of risks and potential breaking changes"
}

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * Parse Claude response to extract JSON
 */
interface ParsedProposal {
  analysis: string;
  proposal: string;
  minimalChanges: string[];
  riskAssessment: string;
}

function parseClaudeResponse(content: Anthropic.ContentBlock): ParsedProposal {
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  return JSON.parse(jsonMatch[0]) as ParsedProposal;
}

/**
 * Generate a single patch proposal using Claude
 */
async function generateSinglePatchProposal(
  client: Anthropic,
  vuln: VulnerabilityInfo,
  projectPath: string
): Promise<PatchProposal> {
  const prompt = buildVulnerabilityPrompt(vuln);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const parsedResponse = parseClaudeResponse(response.content[0]);

  return {
    vulnerabilityId: vuln.id,
    ...parsedResponse
  };
}

/**
 * Group vulnerabilities by severity level
 */
function groupBySeverity(
  vulnerabilities: VulnerabilityInfo[],
  proposals: PatchProposal[]
): Record<string, Array<{ vuln: VulnerabilityInfo; proposal: PatchProposal }>> {
  const bySeverity: Record<string, Array<{ vuln: VulnerabilityInfo; proposal: PatchProposal }>> = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };

  vulnerabilities.forEach((vuln, index) => {
    const proposal = proposals[index];
    if (proposal) {
      bySeverity[vuln.severity].push({ vuln, proposal });
    }
  });

  return bySeverity;
}

/**
 * Generate markdown section for a single vulnerability
 */
function generateVulnerabilitySection(
  vuln: VulnerabilityInfo,
  proposal: PatchProposal
): string {
  let section = `### ${vuln.packageName} (${vuln.id})\n\n`;
  section += `**Current Version:** ${vuln.currentVersion}\n`;
  section += `**Fixed Version:** ${vuln.fixedVersion}\n`;
  section += `**Title:** ${vuln.title}\n\n`;

  section += `**AI Analysis:**\n${proposal.analysis}\n\n`;

  section += `**Proposed Changes:**\n`;
  proposal.minimalChanges.forEach((change, i) => {
    section += `${i + 1}. ${change}\n`;
  });
  section += '\n';

  section += `**Risk Assessment:**\n${proposal.riskAssessment}\n\n`;

  if (vuln.url) {
    section += `**Reference:** ${vuln.url}\n\n`;
  }

  section += '---\n\n';

  return section;
}

/**
 * Create a comprehensive patch document for all vulnerabilities
 */
export function createPatchDocument(
  vulnerabilities: VulnerabilityInfo[],
  proposals: PatchProposal[]
): string {
  const timestamp = new Date().toISOString();

  let document = `# Security Patch Proposal
**Generated:** ${timestamp}
**Total Vulnerabilities:** ${vulnerabilities.length}

---

`;

  // Group by severity
  const bySeverity = groupBySeverity(vulnerabilities, proposals);

  // Generate sections for each severity level
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const items = bySeverity[severity];
    if (items.length === 0) continue;

    document += `## ${severity.toUpperCase()} Severity (${items.length})\n\n`;

    items.forEach(({ vuln, proposal }) => {
      document += generateVulnerabilitySection(vuln, proposal);
    });
  }

  return document;
}
