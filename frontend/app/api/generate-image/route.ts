import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: Request): Promise<Response> {
  const { topic, character } = await req.json();

  const pythonPath = path.join(process.cwd(), "..", "t.py");

  return new Promise<Response>((resolve) => {
    const py = spawn("python", [pythonPath, topic, character]);

    let output = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (err) => {
      console.error("Python error:", err.toString());
    });

    py.on("close", () => {
      try {
        const json = JSON.parse(output);
        resolve(NextResponse.json(json));
      } catch {
        resolve(
          NextResponse.json(
            { error: "Invalid AI response" },
            { status: 500 }
          )
        );
      }
    });
  });
}
