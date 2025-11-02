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
      console.error(`Failed to generate patch for ${vuln.packageName}:`, error);
      // Continue with other vulnerabilities
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
 * Generate a single patch proposal using Claude
 */
async function generateSinglePatchProposal(
  client: Anthropic,
  vuln: VulnerabilityInfo,
  projectPath: string
): Promise<PatchProposal> {
  const prompt = `You are a security expert analyzing a vulnerability in a software project.

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

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse the JSON response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }

  const parsedResponse = JSON.parse(jsonMatch[0]);

  return {
    vulnerabilityId: vuln.id,
    analysis: parsedResponse.analysis,
    proposal: parsedResponse.proposal,
    minimalChanges: parsedResponse.minimalChanges,
    riskAssessment: parsedResponse.riskAssessment
  };
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

  // Generate sections for each severity level
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const items = bySeverity[severity];
    if (items.length === 0) continue;

    document += `## ${severity.toUpperCase()} Severity (${items.length})\n\n`;

    items.forEach(({ vuln, proposal }) => {
      document += `### ${vuln.packageName} (${vuln.id})\n\n`;
      document += `**Current Version:** ${vuln.currentVersion}\n`;
      document += `**Fixed Version:** ${vuln.fixedVersion}\n`;
      document += `**Title:** ${vuln.title}\n\n`;

      document += `**AI Analysis:**\n${proposal.analysis}\n\n`;

      document += `**Proposed Changes:**\n`;
      proposal.minimalChanges.forEach((change, i) => {
        document += `${i + 1}. ${change}\n`;
      });
      document += '\n';

      document += `**Risk Assessment:**\n${proposal.riskAssessment}\n\n`;

      if (vuln.url) {
        document += `**Reference:** ${vuln.url}\n\n`;
      }

      document += '---\n\n';
    });
  }

  return document;
}
