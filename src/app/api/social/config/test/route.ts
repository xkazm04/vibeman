import { NextRequest, NextResponse } from 'next/server';
import { socialConfigRepository } from '@/app/db/repositories/social-config.repository';
import {
  SocialChannelType,
  TestConnectionResponse,
  DiscordCredentials,
  XCredentials,
  InstagramCredentials,
  FacebookCredentials,
  GmailCredentials,
} from '@/app/db/models/social-config.types';
import { decryptCredentials } from '@/app/features/Social/sub_SocConfig/lib/encryption';

/**
 * POST /api/social/config/test
 * Test connection to a social channel
 *
 * Can test with:
 * 1. Raw credentials (for new configs before saving)
 * 2. Config ID (for existing configs)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelType, credentials, configId } = body;

    let testCredentials = credentials;
    let projectId: string | undefined;

    // If configId provided, get credentials from database
    if (configId) {
      const config = socialConfigRepository.getConfigById(configId);
      if (!config) {
        return NextResponse.json(
          { error: 'Config not found' },
          { status: 404 }
        );
      }
      projectId = config.project_id;
      testCredentials = decryptCredentials(config.credentials_encrypted, projectId);
    }

    if (!channelType || !testCredentials) {
      return NextResponse.json(
        { error: 'channelType and credentials (or configId) are required' },
        { status: 400 }
      );
    }

    // Test connection based on channel type
    let result: TestConnectionResponse;

    switch (channelType as SocialChannelType) {
      case 'discord':
        result = await testDiscordConnection(testCredentials as DiscordCredentials);
        break;
      case 'x':
        result = await testXConnection(testCredentials as XCredentials);
        break;
      case 'instagram':
        result = await testInstagramConnection(testCredentials as InstagramCredentials);
        break;
      case 'facebook':
        result = await testFacebookConnection(testCredentials as FacebookCredentials);
        break;
      case 'gmail':
        result = await testGmailConnection(testCredentials as GmailCredentials);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported channel type' },
          { status: 400 }
        );
    }

    // Update connection status in database if testing existing config
    if (configId) {
      socialConfigRepository.updateConnectionStatus(
        configId,
        result.success ? 'connected' : 'failed',
        result.success ? null : result.message
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      } as TestConnectionResponse,
      { status: 500 }
    );
  }
}

/**
 * Test Discord bot connection
 */
async function testDiscordConnection(credentials: DiscordCredentials): Promise<TestConnectionResponse> {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${credentials.botToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Discord API error: ${error.message || response.statusText}`,
      };
    }

    const user = await response.json();

    // Also fetch guilds to show server count
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        Authorization: `Bot ${credentials.botToken}`,
      },
    });

    let serverCount = 0;
    if (guildsResponse.ok) {
      const guilds = await guildsResponse.json();
      serverCount = guilds.length;
    }

    return {
      success: true,
      message: 'Successfully connected to Discord',
      accountInfo: {
        username: user.username,
        displayName: user.global_name || user.username,
        channelCount: serverCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to Discord',
    };
  }
}

/**
 * Test X (Twitter) API connection
 */
async function testXConnection(credentials: XCredentials): Promise<TestConnectionResponse> {
  try {
    // Use bearer token for v2 API if available
    if (credentials.bearerToken) {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${credentials.bearerToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `X API error: ${error.detail || error.title || response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        message: 'Successfully connected to X',
        accountInfo: {
          username: data.data?.username,
          displayName: data.data?.name,
        },
      };
    }

    // Fallback: validate OAuth credentials exist
    if (credentials.apiKey && credentials.apiSecret && credentials.accessToken && credentials.accessTokenSecret) {
      return {
        success: true,
        message: 'OAuth credentials provided - full validation requires OAuth1.0a signing',
        accountInfo: {},
      };
    }

    return {
      success: false,
      message: 'Missing required credentials',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to X',
    };
  }
}

/**
 * Test Instagram Graph API connection
 */
async function testInstagramConnection(credentials: InstagramCredentials): Promise<TestConnectionResponse> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${credentials.accessToken}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Instagram API error: ${error.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Successfully connected to Instagram',
      accountInfo: {
        username: data.username,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to Instagram',
    };
  }
}

/**
 * Test Facebook Graph API connection
 */
async function testFacebookConnection(credentials: FacebookCredentials): Promise<TestConnectionResponse> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name&access_token=${credentials.accessToken}`
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Facebook API error: ${error.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Successfully connected to Facebook',
      accountInfo: {
        displayName: data.name,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to Facebook',
    };
  }
}

/**
 * Test Gmail Service Account connection
 * Uses JWT to get access token for impersonated user
 */
async function testGmailConnection(credentials: GmailCredentials): Promise<TestConnectionResponse> {
  try {
    // Create JWT for service account authentication
    const jwt = await createServiceAccountJWT(
      credentials.serviceAccountEmail,
      credentials.privateKey,
      credentials.delegatedEmail,
      ['https://www.googleapis.com/auth/gmail.readonly']
    );

    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({}));
      return {
        success: false,
        message: `Gmail auth error: ${error.error_description || error.error || 'JWT exchange failed'}`,
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user profile
    const profileResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      return {
        success: false,
        message: 'Failed to fetch Gmail profile. Ensure domain-wide delegation is enabled.',
      };
    }

    const profile = await profileResponse.json();
    return {
      success: true,
      message: 'Successfully connected to Gmail',
      accountInfo: {
        email: profile.emailAddress,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to connect to Gmail',
    };
  }
}

/**
 * Create a JWT for Google Service Account authentication
 */
async function createServiceAccountJWT(
  serviceAccountEmail: string,
  privateKey: string,
  delegatedEmail: string,
  scopes: string[]
): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    sub: delegatedEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;

  // Sign with private key
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');

  return `${signatureInput}.${signature}`;
}
