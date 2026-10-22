import test from "node:test";
import assert from "node:assert/strict";
import { tapTapChannel } from "../scripts/site/channels.mjs";
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
