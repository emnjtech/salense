/* global console, process */

import "reflect-metadata";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { BcryptPasswordHasherService } from "../auth/security/index.js";
import { DatabaseModule } from "../database/database.module.js";
import { PlatformAdminService } from "./platform-admin.service.js";

const args = parseArgs(process.argv.slice(2));

@Module({
  imports: [DatabaseModule],
  providers: [BcryptPasswordHasherService, PlatformAdminService],
})
class PlatformAdminCliModule {}

async function main(): Promise<void> {
  const answers = await readInput(args);
  const app = await NestFactory.createApplicationContext(PlatformAdminCliModule, { logger: false });

  try {
    const service = app.get(PlatformAdminService);
    const admin = await service.createPlatformAdmin(answers);

    console.log(`Platform admin ready: ${admin.email} (${admin.role}, ${admin.status})`);
  } finally {
    await app.close();
  }
}

async function readInput(
  initial: Partial<CreatePlatformAdminCliInput>,
): Promise<CreatePlatformAdminCliInput> {
  const missingRequired =
    !initial.email || !initial.password || !initial.firstName || !initial.lastName;

  if (!missingRequired) {
    return initial as CreatePlatformAdminCliInput;
  }

  const rl = createInterface({ input, output });

  try {
    return {
      email: initial.email ?? (await rl.question("Admin email: ")),
      firstName: initial.firstName ?? (await rl.question("First name: ")),
      lastName: initial.lastName ?? (await rl.question("Last name: ")),
      password: initial.password ?? (await rl.question("Password: ")),
    };
  } finally {
    rl.close();
  }
}

interface CreatePlatformAdminCliInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

function parseArgs(values: readonly string[]): Partial<CreatePlatformAdminCliInput> {
  const parsed: Partial<CreatePlatformAdminCliInput> = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value?.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const nextValue = values[index + 1];

    if (!nextValue || nextValue.startsWith("--")) {
      continue;
    }

    if (key === "email" || key === "password") {
      parsed[key] = nextValue;
    } else if (key === "first-name") {
      parsed.firstName = nextValue;
    } else if (key === "last-name") {
      parsed.lastName = nextValue;
    }

    index += 1;
  }

  return parsed;
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message || error.stack || error.name);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
