/**
 * Health Check API Endpoint
 *
 * Used by Cloud Run to verify service health and by monitoring systems.
 *
 * Invariants:
 * - INV-I002: CI must pass lint, typecheck, and tests before deploy
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Health check response type
 */
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
  error?: string;
}

/**
 * GET /api/health
 *
 * Returns the health status of the application including:
 * - Overall status (healthy/unhealthy)
 * - Version (commit SHA or "development")
 * - Database connectivity status
 * - Timestamp
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const version = process.env.COMMIT_SHA || 'development';
  const timestamp = new Date().toISOString();

  try {
    // Check database connectivity with a simple query
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      version,
      database: 'connected',
      timestamp,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        version,
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      },
      { status: 503 }
    );
  }
}
