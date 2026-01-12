import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Enforce explicit return types on functions
      "@typescript-eslint/explicit-function-return-type": "warn",
      // No any types
      "@typescript-eslint/no-explicit-any": "error",
      // Enforce consistent type imports
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
];

export default eslintConfig;
