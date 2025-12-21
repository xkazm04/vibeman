import { NextRequest, NextResponse } from 'next/server';
import { socialConfigRepository, socialFeedbackItemsRepository, socialFetchLogRepository } from '@/app/db/repositories/social-config.repository';
import { decryptCredentials } from '@/app/features/Social/sub_SocConfig/lib/encryption';
import type { SocialChannelType, DiscordCredentials, XCredentials, InstagramCredentials, FacebookCredentials, GmailCredentials } from '@/app/db/models/social-config.types';
import { v4 as uuidv4 } from 'uuid';

interface FetchedItem {
  external_id: string;
  content: string;
  author_name?: string;
  author_id?: string;
  created_at?: string;
  channel: string;
}

interface FetchRequest {
  configId?: string;
  channelType?: SocialChannelType;
  projectId?: string;
  limit?: number;
}

/**
 * POST /api/social/fetch
 * Fetch feedback from a configured social channel
 * Supports fetching by configId or by channelType+projectId
 */
export async function POST(request: NextRequest) {
  try {
    const body: FetchRequest = await request.json();
    const { configId, channelType, projectId, limit = 10 } = body;

    // Get config(s) to fetch from
    let configs;
    if (configId) {
      const config = socialConfigRepository.getConfigById(configId);
      if (!config) {
        return NextResponse.json({ error: 'Config not found' }, { status: 404 });
      }
      configs = [config];
    } else if (channelType && projectId) {
      configs = socialConfigRepository.getConfigsByChannel(projectId, channelType);
      if (configs.length === 0) {
        return NextResponse.json({ error: 'No configs found for this channel' }, { status: 404 });
      }
    } else {
      return NextResponse.json(
        { error: 'Either configId or (channelType + projectId) is required' },
        { status: 400 }
      );
    }

    const allNewItems: FetchedItem[] = [];
    const fetchResults: Array<{
      configId: string;
      configName: string;
      channel: string;
      itemsFetched: number;
      newItems: number;
      error?: string;
    }> = [];

    // Fetch from each config
    for (const config of configs) {
      if (config.is_enabled !== 1) {
        fetchResults.push({
          configId: config.id,
          configName: config.name,
          channel: config.channel_type,
          itemsFetched: 0,
          newItems: 0,
          error: 'Config is disabled',
        });
        continue;
      }

      const logId = uuidv4();
      socialFetchLogRepository.createLog({
        id: logId,
        config_id: config.id,
        status: 'running',
      });

      try {
        // Decrypt credentials
        const credentials = decryptCredentials(config.credentials_encrypted, config.project_id);

        // Fetch items based on channel type
        let items: FetchedItem[] = [];
        switch (config.channel_type as SocialChannelType) {
          case 'discord':
            items = await fetchDiscordMessages(credentials as DiscordCredentials, config.config_json, limit);
            break;
          case 'x':
            items = await fetchXMentions(credentials as XCredentials, config.config_json, limit);
            break;
          case 'instagram':
            items = await fetchInstagramComments(credentials as InstagramCredentials, limit);
            break;
          case 'facebook':
            items = await fetchFacebookComments(credentials as FacebookCredentials, config.config_json, limit);
            break;
          case 'gmail':
            items = await fetchGmailMessages(credentials as GmailCredentials, config.config_json, limit);
            break;
        }

        // Check for duplicates
        const externalIds = items.map(item => item.external_id);
        const existingIds = socialFeedbackItemsRepository.existingIds(config.id, externalIds);
        const newItems = items.filter(item => !existingIds.has(item.external_id));

        // Insert new items
        if (newItems.length > 0) {
          socialFeedbackItemsRepository.insertMany(
            newItems.map(item => ({
              id: uuidv4(),
              config_id: config.id,
              external_id: item.external_id,
              channel_type: config.channel_type,
              content_preview: item.content.substring(0, 500),
              author_name: item.author_name,
              author_id: item.author_id,
              external_created_at: item.created_at,
            }))
          );

          // Update config tracking
          socialConfigRepository.updateFetchTracking(config.id, newItems.length);
        }

        // Complete fetch log
        socialFetchLogRepository.completeLog(logId, newItems.length);

        allNewItems.push(...newItems);
        fetchResults.push({
          configId: config.id,
          configName: config.name,
          channel: config.channel_type,
          itemsFetched: items.length,
          newItems: newItems.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Fetch failed';
        socialFetchLogRepository.failLog(logId, errorMessage);

        fetchResults.push({
          configId: config.id,
          configName: config.name,
          channel: config.channel_type,
          itemsFetched: 0,
          newItems: 0,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalNewItems: allNewItems.length,
      items: allNewItems,
      fetchResults,
    });
  } catch (error) {
    console.error('[Social Fetch] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    );
  }
}

/**
 * Fetch Discord messages from configured channels
 */
async function fetchDiscordMessages(
  credentials: DiscordCredentials,
  configJson: string,
  limit: number
): Promise<FetchedItem[]> {
  const config = JSON.parse(configJson);
  const channelIds: string[] = config.channelIds || [];

  if (channelIds.length === 0) {
    return [];
  }

  const items: FetchedItem[] = [];
  const perChannelLimit = Math.ceil(limit / channelIds.length);

  for (const channelId of channelIds) {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages?limit=${perChannelLimit}`,
        {
          headers: {
            Authorization: `Bot ${credentials.botToken}`,
          },
        }
      );

      if (!response.ok) continue;

      const messages = await response.json();
      for (const msg of messages) {
        items.push({
          external_id: msg.id,
          content: msg.content,
          author_name: msg.author?.username,
          author_id: msg.author?.id,
          created_at: msg.timestamp,
          channel: 'discord',
        });
      }
    } catch {
      // Continue to next channel
    }
  }

  return items.slice(0, limit);
}

/**
 * Fetch X (Twitter) mentions
 */
async function fetchXMentions(
  credentials: XCredentials,
  configJson: string,
  limit: number
): Promise<FetchedItem[]> {
  if (!credentials.bearerToken) {
    return [];
  }

  const config = JSON.parse(configJson);
  const username = config.username;

  if (!username) {
    return [];
  }

  try {
    // Get user ID first
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.bearerToken}`,
        },
      }
    );

    if (!userResponse.ok) return [];

    const userData = await userResponse.json();
    const userId = userData.data?.id;

    if (!userId) return [];

    // Get mentions
    const mentionsResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/mentions?max_results=${Math.min(limit, 100)}&tweet.fields=created_at,author_id`,
      {
        headers: {
          Authorization: `Bearer ${credentials.bearerToken}`,
        },
      }
    );

    if (!mentionsResponse.ok) return [];

    const mentionsData = await mentionsResponse.json();
    const tweets = mentionsData.data || [];

    return tweets.map((tweet: { id: string; text: string; author_id?: string; created_at?: string }) => ({
      external_id: tweet.id,
      content: tweet.text,
      author_id: tweet.author_id,
      created_at: tweet.created_at,
      channel: 'x',
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Instagram comments
 */
async function fetchInstagramComments(
  credentials: InstagramCredentials,
  limit: number
): Promise<FetchedItem[]> {
  try {
    // Get user's recent media
    const mediaResponse = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption&access_token=${credentials.accessToken}&limit=5`
    );

    if (!mediaResponse.ok) return [];

    const mediaData = await mediaResponse.json();
    const mediaItems = mediaData.data || [];

    const items: FetchedItem[] = [];

    // Get comments for each media
    for (const media of mediaItems) {
      const commentsResponse = await fetch(
        `https://graph.instagram.com/${media.id}/comments?fields=id,text,username,timestamp&access_token=${credentials.accessToken}&limit=${Math.ceil(limit / mediaItems.length)}`
      );

      if (!commentsResponse.ok) continue;

      const commentsData = await commentsResponse.json();
      const comments = commentsData.data || [];

      for (const comment of comments) {
        items.push({
          external_id: comment.id,
          content: comment.text,
          author_name: comment.username,
          created_at: comment.timestamp,
          channel: 'instagram',
        });
      }

      if (items.length >= limit) break;
    }

    return items.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Fetch Facebook page comments
 */
async function fetchFacebookComments(
  credentials: FacebookCredentials,
  configJson: string,
  limit: number
): Promise<FetchedItem[]> {
  const config = JSON.parse(configJson);
  const pageId = config.pageId;
  const token = credentials.pageAccessToken || credentials.accessToken;

  if (!pageId || !token) return [];

  try {
    // Get page posts
    const postsResponse = await fetch(
      `https://graph.facebook.com/${pageId}/posts?fields=id&access_token=${token}&limit=5`
    );

    if (!postsResponse.ok) return [];

    const postsData = await postsResponse.json();
    const posts = postsData.data || [];

    const items: FetchedItem[] = [];

    // Get comments for each post
    for (const post of posts) {
      const commentsResponse = await fetch(
        `https://graph.facebook.com/${post.id}/comments?fields=id,message,from,created_time&access_token=${token}&limit=${Math.ceil(limit / posts.length)}`
      );

      if (!commentsResponse.ok) continue;

      const commentsData = await commentsResponse.json();
      const comments = commentsData.data || [];

      for (const comment of comments) {
        items.push({
          external_id: comment.id,
          content: comment.message,
          author_name: comment.from?.name,
          author_id: comment.from?.id,
          created_at: comment.created_time,
          channel: 'facebook',
        });
      }

      if (items.length >= limit) break;
    }

    return items.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Fetch Gmail messages using Service Account
 */
async function fetchGmailMessages(
  credentials: GmailCredentials,
  configJson: string,
  limit: number
): Promise<FetchedItem[]> {
  try {
    // Create JWT and get access token
    const jwt = await createServiceAccountJWT(
      credentials.serviceAccountEmail,
      credentials.privateKey,
      credentials.delegatedEmail,
      ['https://www.googleapis.com/auth/gmail.readonly']
    );

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) return [];

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Parse config for filters
    const config = JSON.parse(configJson);
    let query = 'in:inbox';

    if (config.excludeSpam) query += ' -in:spam';
    if (config.excludePromotions) query += ' -category:promotions';
    if (config.senderFilters?.length > 0) {
      query += ` from:(${config.senderFilters.join(' OR ')})`;
    }
    if (config.subjectFilters?.length > 0) {
      query += ` subject:(${config.subjectFilters.join(' OR ')})`;
    }
    if (config.labelFilters?.length > 0) {
      query += ` label:(${config.labelFilters.join(' OR ')})`;
    }

    // List messages
    const messagesResponse = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!messagesResponse.ok) return [];

    const messagesData = await messagesResponse.json();
    const messageIds = messagesData.messages || [];

    const items: FetchedItem[] = [];

    // Fetch each message
    for (const msg of messageIds.slice(0, limit)) {
      const msgResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!msgResponse.ok) continue;

      const msgData = await msgResponse.json();
      const headers = msgData.payload?.headers || [];
      const subject = headers.find((h: { name: string; value: string }) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: { name: string; value: string }) => h.name === 'From')?.value || '';
      const date = headers.find((h: { name: string; value: string }) => h.name === 'Date')?.value;

      items.push({
        external_id: msg.id,
        content: subject,
        author_name: from,
        created_at: date,
        channel: 'gmail',
      });
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Create JWT for Service Account authentication
 */
async function createServiceAccountJWT(
  serviceAccountEmail: string,
  privateKey: string,
  delegatedEmail: string,
  scopes: string[]
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    sub: delegatedEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;

  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * GET /api/social/fetch
 * Get fetch status and available channels with configs
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const channelCounts = socialConfigRepository.getChannelCounts(projectId);
  const configuredChannels = Object.entries(channelCounts)
    .filter(([, count]) => count > 0)
    .map(([channel]) => channel);

  return NextResponse.json({
    projectId,
    configuredChannels,
    channelCounts,
  });
}
