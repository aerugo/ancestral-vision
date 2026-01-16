/**
 * Configuration Validation Tests
 *
 * TDD Phase: RED - These tests verify project configuration requirements.
 * Tests validate TypeScript settings, dependencies, and environment templates.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project Configuration', () => {
  describe('TypeScript Configuration', () => {
    let tsconfig: { compilerOptions: Record<string, unknown> };

    beforeAll(() => {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')) as typeof tsconfig;
    });

    it('should have strict mode enabled (INV-T001)', () => {
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have path alias @/* configured', () => {
      const paths = tsconfig.compilerOptions.paths as Record<string, string[]> | undefined;
      expect(paths).toBeDefined();
      expect(paths?.['@/*']).toBeDefined();
    });

    it('should target ES2022 or later', () => {
      expect(tsconfig.compilerOptions.target).toBe('ES2022');
    });
  });

  describe('Package Dependencies', () => {
    interface PackageJson {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }

    let packageJson: PackageJson;

    beforeAll(() => {
      const packagePath = path.join(process.cwd(), 'package.json');
      packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8')) as PackageJson;
    });

    it('should have Next.js 15+ or 16+ installed', () => {
      const nextVersion = packageJson.dependencies['next'];
      expect(nextVersion).toBeDefined();
      // Accept versions starting with 15, 16, or ^15, ^16, ~15, ~16
      expect(nextVersion).toMatch(/^[\^~]?(15|16)\./);
    });

    it('should have React 19+ installed', () => {
      const reactVersion = packageJson.dependencies['react'];
      expect(reactVersion).toBeDefined();
      expect(reactVersion).toMatch(/^[\^~]?19\./);
    });

    it('should have Prisma client installed', () => {
      expect(packageJson.dependencies['@prisma/client']).toBeDefined();
    });

    it('should have Three.js installed', () => {
      expect(packageJson.dependencies['three']).toBeDefined();
    });

    it('should have Firebase installed', () => {
      expect(packageJson.dependencies['firebase']).toBeDefined();
    });

    it('should have Firebase Admin installed', () => {
      expect(packageJson.dependencies['firebase-admin']).toBeDefined();
    });

    it('should have GraphQL dependencies installed', () => {
      expect(packageJson.dependencies['graphql']).toBeDefined();
      expect(packageJson.dependencies['graphql-yoga']).toBeDefined();
    });
  });

  describe('Environment Templates', () => {
    it('should have .env.local.example file', () => {
      const envPath = path.join(process.cwd(), '.env.local.example');
      expect(fs.existsSync(envPath)).toBe(true);
    });

    it('should have DATABASE_URL in .env.local.example', () => {
      const envPath = path.join(process.cwd(), '.env.local.example');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('DATABASE_URL');
    });

    it('should have Firebase client config in .env.local.example', () => {
      const envPath = path.join(process.cwd(), '.env.local.example');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('NEXT_PUBLIC_FIREBASE_API_KEY');
      expect(envContent).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    });

    it('should have Firebase admin config in .env.local.example', () => {
      const envPath = path.join(process.cwd(), '.env.local.example');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('FIREBASE_ADMIN_PROJECT_ID');
      expect(envContent).toContain('FIREBASE_ADMIN_PRIVATE_KEY');
    });
  });

  describe('Vitest Configuration', () => {
    it('should have happy-dom environment configured for React testing', () => {
      const vitestPath = path.join(process.cwd(), 'vitest.config.ts');
      const vitestContent = fs.readFileSync(vitestPath, 'utf-8');
      // Using happy-dom instead of jsdom for ESM compatibility
      expect(vitestContent).toContain("environment: 'happy-dom'");
    });
  });
});
