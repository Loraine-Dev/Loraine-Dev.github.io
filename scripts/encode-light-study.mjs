import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
const out = "artifacts/light-study";
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
      "24",
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
      `${out}/${name}-24s.mp4`,
    ]);
  }
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    `${out}/${device}-off-24s.mp4`,
    "-i",
    `${out}/${device}-on-24s.mp4`,
    "-filter_complex",
    "[0:v][1:v]hstack=inputs=2:shortest=1[v]",
    "-map",
    "[v]",
    "-t",
    "24",
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
    `${out}/${device}-comparison-24s.mp4`,
  ]);
  console.log(
    `${device}: 24s 1x, left OFF / right ON, original clouds running on both`,
  );
}
