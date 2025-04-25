// src/html.ts
export function renderLoginPage(error: string) {
  return `
    <html><body>
      <h1>Login</h1>
      ${error ? "<p style='color:red'>Invalid email or password</p>" : ""}
      <form method="POST" action="/login">
        <input name="email" type="email" placeholder="Email" required /><br/>
        <input name="password" type="password" placeholder="Password" required /><br/>
        <button type="submit">Login</button>
      </form>
      <p><a href="/register">Register</a></p>
    </body></html>
  `;
}

export function renderRegisterPage(error: string, success: string) {
  return `
    <html><body>
      <h1>Register</h1>
      ${error === "email_taken" ? "<p style='color:red'>Email already registered</p>" : ""}
      ${error && error !== "email_taken" ? `<p style='color:red'>${error}</p>` : ""}
      ${success === "1" ? "<p style='color:green'>Registration successful! <a href='/'>Log in</a></p>" : ""}
      <form method="POST" action="/register">
        <input name="email" type="email" placeholder="Email" required /><br/>
        <input name="password" type="password" placeholder="Password" required /><br/>
        <button type="submit">Register</button>
      </form>
      <p><a href="/">Back to login</a></p>
    </body></html>
  `;
}

export function renderDashboardPage() {
  return `
    <html><body>
      <h1>Dashboard</h1>
      <p>You are logged in.</p>
      <a href="/logout">Logout</a>
    </body></html>
  `;
}
