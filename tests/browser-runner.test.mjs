import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
test("browser runner rejects occupied ports instead of testing another server", async () => {
  const fixture = createServer((socket) =>
    socket.end("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK"),
  );
  await new Promise((resolve, reject) => {
    fixture.once("error", reject);
    fixture.listen(4180, "127.0.0.1", resolve);
  });
  try {
    await assert.rejects(
      promisify(execFile)(process.execPath, ["scripts/browser-ci.mjs"]),
      (error) => error.code !== 0 && error.stderr.includes("EADDRINUSE"),
    );
  } finally {
    await new Promise((resolve) => fixture.close(resolve));
  }
});
