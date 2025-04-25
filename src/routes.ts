// src/routes.ts
import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { hash, compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { findUserByEmail, createUser } from "./airtable.ts";
import { renderLoginPage, renderRegisterPage, renderDashboardPage } from "./html.ts";
import { validatePassword } from "./password.ts";
import { appendToLog } from "./logger.ts";

export const router = new Router();

router.get("/", (ctx) => {
  const error = ctx.request.url.searchParams.get("error") ?? "";
  ctx.response.type = "text/html";
  ctx.response.body = renderLoginPage(error);
});

router.post("/login", async (ctx) => {
  const formData = await ctx.request.body({ type: "form" }).value;
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    ctx.response.redirect("/?error=1");
    return;
  }

  const user = await findUserByEmail(email);
  
  if (!user || typeof user.fields.passwordHash !== "string" || !(await compare(password, user.fields.passwordHash))) {
    ctx.response.redirect("/?error=1");
    return;
  }

  ctx.cookies.set("auth", user.id, { httpOnly: true });
  ctx.response.redirect("/dashboard");
});

router.get("/dashboard", (ctx) => {
  const auth = ctx.cookies.get("auth")
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
  const formData = await ctx.request.body({ type: "form" }).value;
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    ctx.response.redirect("/register?error=missing_fields");
    return;
  }

  const passwordCheck = validatePassword(password);
  if (passwordCheck instanceof Error) {
    ctx.response.redirect(`/register?error=${encodeURIComponent(passwordCheck.message)}`);
    return;
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    ctx.response.redirect("/register?error=email_taken");
    return;
  }

  const ip = ctx.request.ip ?? ctx.request.headers.get("x-forwarded-for") ?? "unknown";
  const passwordHash = await hash(password);
  const log = appendToLog("", {
    timestamp: Date.now(),
    ip,
    action: "register",
    outcome: "success"
  });

  await createUser({ email, passwordHash, log });
  ctx.response.redirect("/register?success=1");
});