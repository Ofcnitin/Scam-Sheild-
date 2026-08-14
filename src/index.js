import { onRequest as urlHandler } from "../functions/api/url.js";
import { onRequest as phoneHandler } from "../functions/api/phone.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/url") {
      return urlHandler({
        request,
        env,
        params: {},
        waitUntil: ctx.waitUntil.bind(ctx)
      });
    }

    if (url.pathname === "/api/phone") {
      return phoneHandler({
        request,
        env,
        params: {},
        waitUntil: ctx.waitUntil.bind(ctx)
      });
    }

    return env.ASSETS.fetch(request);
  }
};
