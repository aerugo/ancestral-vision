/**
 * Prisma Mock for Testing
 *
 * This mock is automatically used when vi.mock("@/lib/prisma") is called.
 */
import { vi, type Mock } from "vitest";

interface MockPrismaModel {
  findUnique: Mock;
  findFirst: Mock;
  findMany: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
}

interface MockPrismaClient {
  user: MockPrismaModel;
  constellation: MockPrismaModel;
  person: MockPrismaModel;
  relationship: MockPrismaModel;
  $connect: Mock;
  $disconnect: Mock;
  $transaction: Mock;
}

export const prisma: MockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  constellation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  person: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  relationship: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
};

export default prisma;
