import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { createServer } from "node:net";
import { stripVTControlCharacters } from "node:util";
const servers = [];
async function assertFree(port) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen({ host: "127.0.0.1", port, exclusive: true }, () =>
      probe.close(resolve),
    );
  });
}
async function ready(child, port) {
  await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => finish(Error(`Preview ${port} did not announce readiness`)),
      20000,
    );
    const onExit = (code) =>
      finish(Error(`Preview ${port} exited before readiness: ${code}`));
    const onError = (error) => finish(error);
    const onData = (chunk) => {
      output += stripVTControlCharacters(String(chunk));
      if (output.includes(`http://127.0.0.1:${port}/`)) finish();
    };
    function finish(error) {
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("error", onError);
      child.stdout.off("data", onData);
      error ? reject(error) : resolve();
    }
    child.once("exit", onExit);
    child.once("error", onError);
    child.stdout.on("data", onData);
  });
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw Error(`Preview ${port} stopped`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return;
    } catch {}
    await sleep(250);
  }
  throw Error(`Preview ${port} did not start`);
}
async function run(file, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`${file}: ${code}`)),
    );
  });
}
try {
  for (const [port, preview] of [
    [4180, false],
    [4181, true],
  ]) {
    await assertFree(port);
    const child = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        ...(preview ? ["preview"] : []),
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stdout.on("data", (data) => process.stdout.write(data));
    child.stderr.on("data", (data) => process.stderr.write(data));
    servers.push(child);
    await ready(child, port);
  }
  const env = {
    SITE_URL: "http://127.0.0.1:4181/",
    DEV_URL: "http://127.0.0.1:4180/",
  };
  await run("tests/site-browser.mjs", env);
  await run("tests/integrated-materials.mjs", env);
  await run("tests/art-loading-browser.mjs", env);
} finally {
  for (const child of servers) child.kill();
}
