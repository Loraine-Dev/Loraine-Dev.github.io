import { escape as e } from "./markdown.mjs";
// Content configuration is data, never executable URL/HTML input.
export function githubChannel(value) {
  if (value !== "https://github.com/Loraine-Dev")
    throw new Error("GitHub must use the confirmed official HTTPS profile");
  return e(value);
}
// An explicit confirmation flag is required. A null URL renders no placeholder.
export function tapTapChannel(data) {
  const channel = data.taptap;
  if (!channel?.confirmed || !channel.url) return "";
  const url = new URL(channel.url);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !["www.taptap.cn", "taptap.cn", "www.taptap.io", "taptap.io"].includes(
      url.hostname,
    )
  ) {
    throw new Error(
      "TapTap must use an owner-confirmed public HTTPS page, never a developer backend",
    );
  }
  return `<section class="contact-destination"><p class="eyebrow">OFFICIAL TAPTAP</p><a class="contact-link" href="${e(url.href)}" target="_blank" rel="noopener noreferrer">TapTap <span aria-hidden="true">↗</span><span class="sr-only">（新窗口）</span></a></section>`;
}
