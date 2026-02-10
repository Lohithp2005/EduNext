import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const { reportName } = await req.json();

    if (!reportName) {
      return NextResponse.json({ profile: null });
    }

    const reportsDir = join(process.cwd(), "..", "backend", "reports");
    const filePath = join(reportsDir, `${reportName}.json`);

    const content = readFileSync(filePath, "utf-8");
    const profile = JSON.parse(content);

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Failed to get report:", err);
    return NextResponse.json({ profile: null });
  }
}
