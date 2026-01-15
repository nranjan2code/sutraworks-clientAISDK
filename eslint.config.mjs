import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/ban-types": "off", // Loosen strictness for Function types in examples
            "no-console": "off" // Allow console logs for CLI/Example apps
        }
    },
    {
        ignores: ["dist/", "docs/", "website/", "examples/**/*.js"]
    }
];
