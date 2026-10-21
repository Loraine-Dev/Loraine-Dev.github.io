import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = process.cwd(),
  parent = await mkdtemp(join(tmpdir(), "miloqen-rollback-"));
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
try {
  const hashes = [];
  for (const ref of ["f225703", "8c4e474"]) {
    git("merge-base", "--is-ancestor", ref, "HEAD");
    const dir = resolve(parent, ref);
    assert(!relative(parent, dir).startsWith(".."));
    git("worktree", "add", "--detach", dir, ref);
    try {
      assert(
        execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: dir,
          encoding: "utf8",
        }).startsWith(ref),
      );
      const original = await readFile(
        join(dir, "public/art/world-tree/world-desktop.webp"),
      );
      hashes.push(createHash("sha256").update(original).digest("hex"));
      if (ref === "8c4e474")
        await readFile(
          join(dir, "public/art/material-samples/mobile-water/control.webp"),
        );
      assert.equal(
        execFileSync("git", ["status", "--porcelain"], {
          cwd: dir,
          encoding: "utf8",
        }),
        "",
      );
    } finally {
      git("worktree", "remove", dir);
    }
  }
  assert.equal(hashes[0], hashes[1]);
  console.log(
    "PASS detached rollback checkout f225703 / 8c4e474, clean snapshots, identical original art, retained materials; no branch reset or publication.",
  );
} finally {
  await rm(parent, { recursive: true, force: true });
}
