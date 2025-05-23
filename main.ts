/// main.ts - Main application file with Oak and Airtable integration

import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { router } from "./src/routes.ts";

const env = config();
const PORT = parseInt(env.PORT || Deno.env.get("PORT") || "8000");

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Server error:", err);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
});

console.log(`Server running at http://localhost:${PORT}`);
await app.listen({ port: PORT });
