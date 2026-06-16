import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const binaryExtensions = new Set([".gif", ".icns", ".ico", ".jpeg", ".jpg", ".pdf", ".png", ".webp", ".zip"]);

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const filesWithCarriageReturns = trackedFiles.filter((filePath) => {
  if (binaryExtensions.has(extname(filePath).toLowerCase())) {
    return false;
  }

  const content = readFileSync(filePath);

  if (content.includes(0)) {
    return false;
  }

  return content.includes(13);
});

if (filesWithCarriageReturns.length > 0) {
  console.error("FlowDesk expected LF line endings in tracked text files:");
  for (const filePath of filesWithCarriageReturns) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

console.log(`FlowDesk line ending check passed: ${trackedFiles.length} tracked files scanned.`);
