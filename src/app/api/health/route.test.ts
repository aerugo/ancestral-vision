import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 for health check when database is connected', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }]);

      const response = await GET();

      expect(response.status).toBe(200);
    });

    it('should include status "healthy" in response', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('healthy');
    });

    it('should include version in response', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
    });

    it('should include database status as "connected" when DB is available', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.database).toBe('connected');
    });

    it('should include timestamp in response', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ '?column?': 1 }]);

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });

    it('should return 503 when database is disconnected', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

      const response = await GET();

      expect(response.status).toBe(503);
    });

    it('should include status "unhealthy" when database fails', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('unhealthy');
    });

    it('should include database status as "disconnected" when DB fails', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

      const response = await GET();
      const data = await response.json();

      expect(data.database).toBe('disconnected');
    });

    it('should include error message when database fails', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

      const response = await GET();
      const data = await response.json();

      expect(data.error).toBe('Connection refused');
    });
  });
});
