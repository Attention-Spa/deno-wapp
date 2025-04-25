/// main.ts - Main application file with Oak and Airtable integration

import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { router } from "./src/routes.ts";

const env = config();
const PORT = parseInt(env.PORT || Deno.env.get("PORT") || "8000");

const app = new Application();

app.use(async (ctx, next) => {

  try {
    await next();
  } catch (err) {

    if (typeof err === "object" && err !== null) {
      const E = Object.fromEntries(Reflect.ownKeys(err).map(k => [k, Reflect.get(err, k)]));
      console.error({ error: E });
      return E;
    }
    console.error("Server error:", err);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

await app.listen({ port: PORT });
