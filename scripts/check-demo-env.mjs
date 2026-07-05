/* global Buffer, URL, console */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const requiredVariables = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_ACCESS_TOKEN_SECRET",
  "JWT_REFRESH_TOKEN_SECRET",
  "JWT_ACCESS_TOKEN_EXPIRES_IN",
  "JWT_REFRESH_TOKEN_EXPIRES_IN",
  "SALENSE_CREDENTIAL_ENCRYPTION_KEY",
];

const placeholderValues = new Set([
  "replace-with-a-secure-access-token-secret",
  "replace-with-a-secure-refresh-token-secret",
  "base64-encoded-32-byte-key",
]);

const workspaceRoot = process.cwd();
const envFiles = [".env", ".env.local"]
  .map((fileName) => path.join(workspaceRoot, fileName))
  .filter((filePath) => fs.existsSync(filePath));

const loadedEnvironment = Object.assign({}, ...envFiles.map(readEnvFile), process.env);
const failures = [];
const warnings = [];

for (const variableName of requiredVariables) {
  const value = loadedEnvironment[variableName]?.trim();

  if (!value) {
    failures.push(`${variableName} is missing.`);
    continue;
  }

  if (placeholderValues.has(value)) {
    failures.push(`${variableName} still uses the example placeholder value.`);
  }
}

validateUrl("DATABASE_URL", ["postgresql:", "postgres:"], loadedEnvironment.DATABASE_URL);
validateUrl("REDIS_URL", ["redis:", "rediss:"], loadedEnvironment.REDIS_URL);
validateEncryptionKey(loadedEnvironment.SALENSE_CREDENTIAL_ENCRYPTION_KEY);

const connectivityChecks = [
  ["PostgreSQL", loadedEnvironment.DATABASE_URL],
  ["Redis", loadedEnvironment.REDIS_URL],
].map(async ([name, rawUrl]) => {
  if (!rawUrl) {
    return;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const port = Number(parsedUrl.port || (parsedUrl.protocol.startsWith("redis") ? 6379 : 5432));
    const reachable = await canConnect(parsedUrl.hostname, port);

    if (!reachable) {
      warnings.push(`${name} is not reachable at ${parsedUrl.hostname}:${port}.`);
    }
  } catch {
    // URL validation already reports malformed values.
  }
});

await Promise.all(connectivityChecks);

if (envFiles.length === 0) {
  warnings.push("No .env or .env.local file was found. Create .env.local from .env.local.example.");
}

if (failures.length > 0) {
  printResults("Salense demo environment check failed", failures, warnings);
  process.exitCode = 1;
} else {
  printResults("Salense demo environment check passed", [], warnings);
}

function readEnvFile(filePath) {
  const values = {};
  const contents = fs.readFileSync(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    values[key] = value;
  }

  return values;
}

function validateUrl(variableName, allowedProtocols, rawValue) {
  if (!rawValue) {
    return;
  }

  try {
    const parsedUrl = new URL(rawValue);

    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      failures.push(`${variableName} must use ${allowedProtocols.join(" or ")}.`);
    }

    if (!parsedUrl.hostname) {
      failures.push(`${variableName} must include a host.`);
    }
  } catch {
    failures.push(`${variableName} must be a valid URL.`);
  }
}

function validateEncryptionKey(rawValue) {
  if (!rawValue || placeholderValues.has(rawValue)) {
    return;
  }

  const decodedKey = Buffer.from(rawValue, "base64");

  if (decodedKey.length !== 32 || decodedKey.toString("base64") !== rawValue) {
    failures.push("SALENSE_CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: 1500 });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => resolve(false));
  });
}

function printResults(title, errors, notices) {
  console.log(title);

  if (errors.length > 0) {
    console.log("\nFix these before running the demo:");
    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }

  if (notices.length > 0) {
    console.log("\nService notices:");
    for (const notice of notices) {
      console.log(`- ${notice}`);
    }
  }

  if (errors.length === 0 && notices.length === 0) {
    console.log("- Required variables are present and local services are reachable.");
  }
}
