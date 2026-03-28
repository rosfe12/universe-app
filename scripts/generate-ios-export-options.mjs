import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const teamId = process.env.IOS_TEAM_ID?.trim() || "T7568AP66M";

const outputPath = process.env.IOS_EXPORT_OPTIONS_OUTPUT?.trim()
  ? path.resolve(process.env.IOS_EXPORT_OPTIONS_OUTPUT)
  : path.join(rootDir, "build", "ExportOptions-AppStore.plist");

await fs.mkdir(path.dirname(outputPath), { recursive: true });

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>destination</key>
  <string>upload</string>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>teamID</key>
  <string>${teamId}</string>
  <key>uploadSymbols</key>
  <true/>
  <key>uploadBitcode</key>
  <false/>
</dict>
</plist>
`;

await fs.writeFile(outputPath, plist, "utf8");

console.log(outputPath);
