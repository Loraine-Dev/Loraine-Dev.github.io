import { escape as e } from "./markdown.mjs";

// A game page is separate from the still-unconfirmed public publisher profile.
export function gameDestination(work) {
  if (!work.play?.confirmed || !work.play.url) return "";
  const url = new URL(work.play.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.taptap.cn" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !/^\/app\/\d+\/?$/.test(url.pathname)
  )
    throw Error(
      "Use a confirmed public TapTap game page, never a developer backend",
    );
  return `<a class="text-link" href="${e(url.href)}" target="_blank" rel="noopener noreferrer">前往 TapTap<span aria-hidden="true">↗</span><span class="sr-only">（新窗口）</span></a>`;
}
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
