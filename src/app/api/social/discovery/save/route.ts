import { NextRequest, NextResponse } from 'next/server';
import { socialFeedbackItemsRepository } from '@/app/db/repositories/social-config.repository';
import { discoveryConfigRepository } from '@/app/db/repositories/social-discovery.repository';
import type { DiscoveredTweet, SaveTweetsResponse } from '@/app/features/Social/sub_SocDiscovery/lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/social/discovery/save
 * Save selected tweets as feedback items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, configId, tweets } = body as {
      projectId: string;
      configId: string;
      tweets: DiscoveredTweet[];
    };

    if (!projectId || !configId || !tweets || tweets.length === 0) {
      return NextResponse.json(
        { error: 'projectId, configId, and tweets array are required' },
        { status: 400 }
      );
    }

    // Verify config exists
    const config = discoveryConfigRepository.getConfigById(configId);
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    // Prepare items for insertion
    const items = tweets.map((tweet) => ({
      id: uuidv4(),
      config_id: configId,
      external_id: tweet.id,
      channel_type: 'x',
      content_preview: tweet.text.substring(0, 500),
      author_name: tweet.authorName || tweet.authorUsername,
      author_id: tweet.authorUsername,
      external_created_at: tweet.createdAt,
    }));

    // Insert items (duplicates will be ignored)
    const savedCount = socialFeedbackItemsRepository.insertMany(items);

    // Update discovery config tracking
    discoveryConfigRepository.updateSearchTracking(configId, savedCount);

    const result: SaveTweetsResponse = {
      success: true,
      savedCount,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Discovery Save] Error:', error);
    return NextResponse.json(
      {
        success: false,
        savedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to save tweets',
      } as SaveTweetsResponse,
      { status: 500 }
    );
  }
}
