/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@salense/database$": "<rootDir>/packages/database/src/index.ts",
    "^@salense/database/prisma$": "<rootDir>/packages/database/src/prisma.ts",
    "^@salense/integrations$": "<rootDir>/packages/integrations/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/dist", "<rootDir>/.next"],
  passWithNoTests: true,
};
