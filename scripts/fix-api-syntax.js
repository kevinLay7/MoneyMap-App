#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Directory containing generated API files
const apiGenDir = path.join(__dirname, "../api/gen");

console.log("🔧 Fixing generated API syntax...");

// Find all TypeScript files in the api/gen directory
const files = fs
  .readdirSync(apiGenDir)
  .filter((file) => file.endsWith(".ts"))
  .map((file) => path.join(apiGenDir, file));

files.forEach((filePath) => {
  const fileName = path.basename(filePath);

  // Skip data-contracts.ts and http-client.ts as they don't have this issue
  if (fileName === "data-contracts.ts" || fileName === "http-client.ts") {
    return;
  }

  console.log(`📝 Fixing ${fileName}...`);

  let content = fs.readFileSync(filePath, "utf8");

  // Fix method signatures: change ': (' to '= (' for methods with default parameters
  content = content.replace(
    /(\w+): \(([^)]*params: RequestParams = \{\}[^)]*)\) =>/g,
    "$1 = ($2) =>"
  );

  // Fix method signatures: change ': (query?: {' to '= (query?: {'
  content = content.replace(/(\w+): \((query\??: \{)/g, "$1 = ($2");

  // Fix method signatures: change ': (query: {' to '= (query: {'
  content = content.replace(/(\w+): \((query: \{)/g, "$1 = ($2");

  // Fix trailing commas and formatting
  content = content.replace(
    /    \}\),            \/\*\*/g,
    "    });\n    \n    /**"
  );

  // Fix final closing brace
  content = content.replace(/    \}\),    \}/g, "    });\n}");

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Fixed ${fileName}`);
});

console.log("🎉 All API files have been fixed!");
