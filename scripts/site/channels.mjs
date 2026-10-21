import { escape as e } from "./markdown.mjs";
// An explicit confirmation flag is required. A null URL renders no placeholder.
export function tapTapChannel(data) {
  const channel = data.taptap;
  if (!channel?.confirmed || !channel.url) return "";
  const url = new URL(channel.url);
  if (
    url.protocol !== "https:" ||
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
