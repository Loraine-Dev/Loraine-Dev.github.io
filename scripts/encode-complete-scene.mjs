import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const out = "artifacts/complete-site/motion";
for (const device of ["desktop", "mobile"]) {
  const report = JSON.parse(
    await fs.readFile(`${out}/${device}-report.json`, "utf8"),
  );
  for (const s of report.sessions) {
    const name = `${device}-${s.mode}`;
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(s.recordingLeadSeconds),
      "-i",
      `${out}/${name}.webm`,
      "-t",
      "30",
      "-c:v",
      "libx264",
      "-crf",
      "17",
      "-preset",
      "fast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      `${out}/${name}-30s.mp4`,
    ]);
  }
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    `${out}/${device}-off-30s.mp4`,
    "-i",
    `${out}/${device}-on-30s.mp4`,
    "-filter_complex",
    "[0:v][1:v]hstack=inputs=2:shortest=1[v]",
    "-map",
    "[v]",
    "-t",
    "30",
    "-c:v",
    "libx264",
    "-crf",
    "17",
    "-preset",
    "fast",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    `${out}/${device}-comparison-30s.mp4`,
  ]);
  console.log(
    `${device}: normal-speed 30s, left ray OFF / right ON, accepted clouds present on both`,
  );
}
