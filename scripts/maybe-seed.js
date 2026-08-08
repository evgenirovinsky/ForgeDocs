if (process.env.RUN_SEED !== "true") {
  process.exit(0);
}

const { spawnSync } = require("node:child_process");

console.log("RUN_SEED=true — seeding database…");
const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

if (result.status !== 0) {
  console.error("Seed failed");
  process.exit(result.status ?? 1);
}

console.log("Seed complete. Set RUN_SEED=false after first boot.");
