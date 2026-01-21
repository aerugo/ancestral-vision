/**
 * Biography Generation SSE Endpoint
 *
 * Server-Sent Events endpoint for real-time biography generation progress.
 * Streams progress updates as the generation proceeds through each step.
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check
 * - INV-AI002: AI Operations Must Track Usage
 * - INV-AI003: AI Suggestions Require User Approval
 */
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateBiography } from '@/ai/flows/biography';
import { checkAndConsumeQuota, QuotaExceededError } from '@/ai/quota';
import { prisma } from '@/lib/prisma';
import type { BiographyProgressEvent, BiographyGenerationResult } from '@/types/biography-progress';

/**
 * GET /api/ai/biography/stream
 *
 * Query parameters:
 * - personId: ID of the person to generate biography for (required)
 * - token: Auth token (required, since EventSource doesn't support headers)
 * - maxLength: Maximum word count (optional, default 500)
 *
 * Returns: Server-Sent Events stream with BiographyProgressEvent data
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const personId = searchParams.get('personId');
  const token = searchParams.get('token');
  const maxLengthParam = searchParams.get('maxLength');

  // Validate required parameters
  if (!personId) {
    return new Response(JSON.stringify({ error: 'Missing personId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token parameter' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authenticate user
  const authHeader = `Bearer ${token}`;
  const user = await getCurrentUser(authHeader);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const maxLength = maxLengthParam ? parseInt(maxLengthParam, 10) : 500;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const send = (event: BiographyProgressEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        // Check and consume quota (INV-AI001, INV-AI002)
        try {
          await checkAndConsumeQuota(user.id);
        } catch (error) {
          if (error instanceof QuotaExceededError) {
            send({
              step: 'error',
              progress: 0,
              message: 'AI operation quota exceeded',
              details: { error: 'QUOTA_EXCEEDED' },
            });
            controller.close();
            return;
          }
          throw error;
        }

        // Generate biography with progress callback
        const result = await generateBiography(personId, user.id, {
          maxLength,
          onProgress: send,
        });

        // Create AI suggestion (INV-AI003)
        const suggestion = await prisma.aISuggestion.create({
          data: {
            type: 'BIOGRAPHY',
            status: 'PENDING',
            personId: result.personId,
            userId: user.id,
            payload: { biography: result.biography },
            metadata: {
              wordCount: result.wordCount,
              confidence: result.confidence,
              sourcesUsed: result.sourcesUsed,
              usedContextMining: result.usedContextMining,
              relativesUsed: result.relativesUsed,
            },
          },
        });

        // Send completion event
        const completionResult: BiographyGenerationResult = {
          suggestionId: suggestion.id,
          biography: result.biography,
          wordCount: result.wordCount,
          confidence: result.confidence,
          sourcesUsed: result.sourcesUsed,
        };

        send({
          step: 'complete',
          progress: 100,
          message: `Biography generated! ${result.wordCount} words`,
          details: { result: completionResult },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        // Determine error type for user-friendly message
        let userMessage = 'Generation failed';
        let errorCode = 'AI_GENERATION_FAILED';

        if (message.includes('not eligible') || message.includes('at least one note or event')) {
          userMessage = 'This person needs at least one note or event before generating a biography';
          errorCode = 'NOT_ELIGIBLE';
        } else if (message.includes('not found') || message.includes('access denied')) {
          userMessage = 'Person not found or access denied';
          errorCode = 'NOT_FOUND';
        }

        send({
          step: 'error',
          progress: 0,
          message: userMessage,
          details: { error: errorCode },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
