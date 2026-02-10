import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export async function GET(req: NextRequest) {
  try {
    const reportsDir = join(process.cwd(), "..", "backend", "reports");
    
    // Read all JSON files from the reports directory
    const files = readdirSync(reportsDir).filter(file => file.endsWith(".json"));
    
    const reports = files.map(file => {
      try {
        const filePath = join(reportsDir, file);
        const content = readFileSync(filePath, "utf-8");
        const data = JSON.parse(content);
        return {
          name: file.replace(".json", ""),
          label: `${data.name || "Unknown"} (${new Date(data.date).toLocaleDateString()})`,
        };
      } catch (err) {
        console.error(`Failed to read report ${file}:`, err);
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("Failed to list reports:", err);
    return NextResponse.json({ reports: [] });
  }
}
