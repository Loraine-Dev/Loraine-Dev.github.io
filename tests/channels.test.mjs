import test from "node:test";
import assert from "node:assert/strict";
import { tapTapChannel, gameDestination } from "../scripts/site/channels.mjs";

test("game links require confirmed public TapTap app URLs and never expose developer routes", () => {
  assert.equal(gameDestination({}), "");
  assert.equal(
    gameDestination({
      play: { url: "https://www.taptap.cn/app/1036533", confirmed: false },
    }),
    "",
  );
  assert.match(
    gameDestination({
      play: { url: "https://www.taptap.cn/app/1036533", confirmed: true },
    }),
    /href="https:\/\/www.taptap.cn\/app\/1036533"/,
  );
  for (const url of [
    "https://developer.taptap.cn/v3/495455/app/1036533",
    "javascript:alert(1)",
    "https://www.taptap.cn.evil.test/app/1036533",
    "https://user@www.taptap.cn/app/1036533",
    "https://www.taptap.cn/app/1036533?redirect=evil",
    "https://www.taptap.cn:444/app/1036533",
  ])
    assert.throws(() => gameDestination({ play: { url, confirmed: true } }));
});
test("unconfirmed or missing channel never renders", () => {
  assert.equal(tapTapChannel({}), "");
  assert.equal(tapTapChannel({ taptap: { url: null, confirmed: false } }), "");
  assert.equal(
    tapTapChannel({
      taptap: { url: "https://www.taptap.cn/", confirmed: false },
    }),
    "",
  );
});
test("developer backends cannot become public contact destinations", () => {
  assert.throws(() =>
    tapTapChannel({
      taptap: { url: "https://developer.taptap.cn/", confirmed: true },
    }),
  );
  assert.throws(() =>
    tapTapChannel({ taptap: { url: "javascript:alert(1)", confirmed: true } }),
  );
});
