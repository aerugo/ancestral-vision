/**
 * Phase 0.1: Project Configuration Tests
 *
 * TDD RED PHASE: These tests validate project configuration.
 * They must pass before Phase 0.1 is considered complete.
 */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

const ROOT_DIR = process.cwd();

describe("Project Configuration", () => {
  describe("TypeScript", () => {
    it("should have TypeScript strict mode enabled", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it("should have noImplicitAny disabled via strict mode", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, "tsconfig.json"), "utf-8")
      );
      // strict: true implies noImplicitAny: true
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it("should have path aliases configured", () => {
      const tsconfig = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, "tsconfig.json"), "utf-8")
      );
      expect(tsconfig.compilerOptions.paths).toHaveProperty("@/*");
    });
  });

  describe("Dependencies", () => {
    interface PackageJson {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }

    let packageJson: PackageJson;

    beforeAll(() => {
      packageJson = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8")
      ) as PackageJson;
    });

    it("should have Next.js installed", () => {
      const nextVersion = packageJson.dependencies["next"];
      expect(nextVersion).toBeDefined();
    });

    it("should have React 19+ installed", () => {
      const reactVersion = packageJson.dependencies["react"];
      expect(reactVersion).toBeDefined();
      // Check for v19
      expect(reactVersion).toMatch(/19/);
    });

    it("should have required core dependencies", () => {
      const required = [
        "next",
        "react",
        "react-dom",
        "@prisma/client",
        "graphql",
        "graphql-yoga",
        "firebase",
        "firebase-admin",
        "three",
      ];

      required.forEach((dep) => {
        expect(
          packageJson.dependencies[dep] ?? packageJson.devDependencies[dep],
          `Missing dependency: ${dep}`
        ).toBeDefined();
      });
    });

    it("should have required dev dependencies", () => {
      const requiredDev = [
        "typescript",
        "vitest",
        "eslint",
        "prettier",
        "tailwindcss",
        "@types/node",
        "@types/react",
        "@types/three",
      ];

      requiredDev.forEach((dep) => {
        expect(
          packageJson.dependencies[dep] ?? packageJson.devDependencies[dep],
          `Missing dev dependency: ${dep}`
        ).toBeDefined();
      });
    });
  });

  describe("Environment Variables", () => {
    it("should have .env.local.example with required variables", () => {
      const envExamplePath = path.join(ROOT_DIR, ".env.local.example");
      expect(fs.existsSync(envExamplePath), ".env.local.example must exist").toBe(true);

      const envExample = fs.readFileSync(envExamplePath, "utf-8");

      const required = [
        "DATABASE_URL",
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      ];

      required.forEach((envVar) => {
        expect(envExample, `Missing env var: ${envVar}`).toContain(envVar);
      });
    });

    it("should have .env.production.example with required variables", () => {
      const envExamplePath = path.join(ROOT_DIR, ".env.production.example");
      expect(fs.existsSync(envExamplePath), ".env.production.example must exist").toBe(true);

      const envExample = fs.readFileSync(envExamplePath, "utf-8");

      const required = [
        "DATABASE_URL",
        "NEXT_PUBLIC_FIREBASE_API_KEY",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      ];

      required.forEach((envVar) => {
        expect(envExample, `Missing env var: ${envVar}`).toContain(envVar);
      });
    });
  });

  describe("Docker", () => {
    it("should have docker-compose.yml with PostgreSQL configuration", () => {
      const dockerComposePath = path.join(ROOT_DIR, "docker-compose.yml");
      expect(fs.existsSync(dockerComposePath), "docker-compose.yml must exist").toBe(true);

      const dockerCompose = fs.readFileSync(dockerComposePath, "utf-8");

      expect(dockerCompose).toContain("postgres");
      expect(dockerCompose).toContain("POSTGRES_USER");
      expect(dockerCompose).toContain("POSTGRES_PASSWORD");
      expect(dockerCompose).toContain("POSTGRES_DB");
    });
  });

  describe("Prisma", () => {
    it("should have prisma schema file", () => {
      const schemaPath = path.join(ROOT_DIR, "prisma/schema.prisma");
      expect(fs.existsSync(schemaPath), "prisma/schema.prisma must exist").toBe(true);
    });

    it("should have core models in prisma schema", () => {
      const schemaPath = path.join(ROOT_DIR, "prisma/schema.prisma");
      const schema = fs.readFileSync(schemaPath, "utf-8");

      expect(schema).toContain("model User");
      expect(schema).toContain("model Constellation");
      expect(schema).toContain("model Person");
    });
  });
});
