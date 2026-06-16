import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const tsFiles = ["src/**/*.{ts,tsx}", "vite.config.ts"];

const restrictImports = (patterns) => [
  "error",
  {
    patterns: patterns.map(({ group, message }) => ({
      group,
      message,
    })),
  },
];

export default tseslint.config(
  {
    ignores: [".local/**", "dist/**", "node_modules/**", "src-tauri/target/**"],
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    files: tsFiles,
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["vite.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowBoolean: true,
          allowNever: true,
          allowNullish: true,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      "no-console": ["error", { allow: ["error", "warn"] }],
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictImports([
        {
          group: ["../*"],
          message: "Domain code must stay independent from application, feature, store, and infrastructure layers.",
        },
      ]),
    },
  },
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictImports([
        {
          group: ["../features/*", "../../features/*", "../stores/*", "../../stores/*"],
          message: "Shared library code must not depend on feature UI or application stores.",
        },
      ]),
    },
  },
  {
    files: ["src/stores/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictImports([
        {
          group: ["../app/*", "../components/*", "../features/*", "../../features/*"],
          message: "Store code must stay independent from React feature and app UI layers.",
        },
      ]),
    },
  },
);
