import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { hash, compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { findUserByUsername, createUser } from "./airtable.ts";
import { validatePassword } from "./password.ts";
import {
  renderLoginPage,
  renderRegisterPage,
  renderDashboardPage,
} from "./html.ts";

import { appendToLog } from "./logger.ts";
export { isRateLimited, incrementIpAttempts, getClientIp } from "./utils.ts";
export const router = new Router();

router.get("/", (ctx) => {
  const error = ctx.request.url.searchParams.get("error") ?? "";
  ctx.response.type = "text/html";
  ctx.response.body = renderLoginPage(error);
});

router.post("/login", async (ctx) => {
  const formData = await ctx.request.body({ type: "form" }).value;
  const username = formData.get("username");
  const password = formData.get("password");

  if (!username || !password) {
    ctx.response.redirect("/?error=1");
    return;
  }

  const user = await findUserByUsername(username);
  if (!user || !(await compare(password, user.fields.passwordHash))) {
    ctx.response.redirect("/?error=1");
    return;
  }

  ctx.cookies.set("auth", user.id, { httpOnly: true });
  ctx.response.redirect("/dashboard");
});

router.get("/dashboard", (ctx) => {
  const auth = ctx.cookies.get("auth");
  if (!auth) {
    ctx.response.redirect("/?error=1");
    return;
  }

  ctx.response.type = "text/html";
  ctx.response.body = renderDashboardPage();
});

router.get("/logout", (ctx) => {
  ctx.cookies.delete("auth");
  ctx.response.redirect("/");
});

router.get("/register", (ctx) => {
  const error = ctx.request.url.searchParams.get("error") ?? "";
  const success = ctx.request.url.searchParams.get("success") ?? "";
  ctx.response.type = "text/html";
  ctx.response.body = renderRegisterPage(error, success);
});

router.post("/register", async (ctx) => {

  const ip = ctx.request.ip ?? ctx.request.headers.get("x-forwarded-for") ?? "unknown";

  const formData = await ctx.request.body({ type: "form" }).value;
  const username = formData.get("username");
  const password = formData.get("password");

  if (!username || !password) {
    ctx.response.redirect("/register?error=1");
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    ctx.response.redirect(`/register?error=${encodeURIComponent(passwordError)}`);
    return;
  }

  const exists = await findUserByUsername(username);

  if (exists) {
    ctx.response.redirect("/register?error=1");
    return;
  }

  const passwordHash = await hash(password);

  const logEntry = appendToLog("", {
    timestamp: Date.now(),
    ip,
    action: "register",
    outcome: "success"
  });


  await createUser({ username, passwordHash, email: username, log: logEntry });

  ctx.response.redirect("/register?success=1");
});


