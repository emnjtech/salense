/* global console, process */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const args = parseArgs(process.argv.slice(2));

async function main() {
  const answers = await readInput(args);
  const email = answers.email.trim().toLowerCase();

  if (!isStrongPassword(answers.password)) {
    throw new Error(
      "Admin password must be at least 12 characters and include uppercase, lowercase, number, and symbol.",
    );
  }

  const passwordHash = await bcrypt.hash(answers.password, 12);
  const admin = await prisma.platformAdmin.upsert({
    where: { email },
    update: {
      firstName: answers.firstName.trim(),
      lastName: answers.lastName.trim(),
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      firstName: answers.firstName.trim(),
      lastName: answers.lastName.trim(),
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    select: {
      email: true,
      id: true,
      role: true,
      status: true,
    },
  });

  console.log(`Platform admin ready: ${admin.email} (${admin.role}, ${admin.status})`);
}

async function readInput(initial) {
  const missingRequired =
    !initial.email || !initial.password || !initial.firstName || !initial.lastName;

  if (!missingRequired) {
    return initial;
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

function parseArgs(values) {
  const parsed = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const nextValue = values[index + 1];

    if (!nextValue || nextValue.startsWith("--")) {
      continue;
    }

    if (key === "first-name") {
      parsed.firstName = nextValue;
    } else if (key === "last-name") {
      parsed.lastName = nextValue;
    } else {
      parsed[key] = nextValue;
    }

    index += 1;
  }

  return parsed;
}

function isStrongPassword(password) {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
