import { exec } from "https://deno.land/x/exec/mod.ts";

async function runPreBuildTasks() {
  console.log("Running pre-build tasks...");

  // Install dependencies
  console.log("Installing dependencies...");
  await exec("deno cache --reload");

  // Generate CSS (if using Tailwind)
  console.log("Building CSS...");
  await exec("npx tailwindcss -i ./src/index.css -o ./dist/output.css");

  // Validate configurations
  console.log("Validating configurations...");
  // Add any validation logic here

  console.log("Pre-build tasks completed successfully.");
}

await runPreBuildTasks();