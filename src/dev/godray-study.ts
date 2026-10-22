import { mountGodrays } from "../scenes/godrays";
export const mountGodrayStudy = (
  controller: Parameters<typeof mountGodrays>[0],
  world: HTMLElement,
) => mountGodrays(controller, world, true);
