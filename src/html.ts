// src/html.ts

export function renderLoginPage(error: string) {
  
  return `
      <html>
        <head><title>Login</title></head>
        <body>
          <h1>Login</h1>
          ${error ? `<p style='color:red'>${error ?? 'Invalid login info'}</p>` : ""}
          <form method="POST" action="/login">
            <input name="username" placeholder="Email or username" required /><br/>
            <input name="password" type="password" placeholder="Password" required /><br/>
            <button type="submit">Login</button>
          </form>
          <p><a href="/register">Register</a></p>
        </body>
      </html>
    `;
}

export function renderRegisterPage(error: string, success: string) {
  return `
      <html>
        <head><title>Register</title></head>
        <body>
          <h1>Register</h1>
          ${error ? `<p style='color:red'>${error}</p>` : ""}
          ${success ? "<p style='color:green'>Registered successfully! <a href='/'>Login</a></p>" : ""}
          <form method="POST" action="/register">
            <input name="email" placeholder="email" required /><br/>
            <input name="password" type="password" placeholder="Password" required /><br/>
            <button type="submit">Register</button>
          </form>
        </body>
      </html>
    `;
}

export function renderDashboardPage() {
  return `
      <html>
        <head><title>Dashboard</title></head>
        <body>
          <h1>Welcome to the dashboard!</h1>
          <a href="/logout">Logout</a>
        </body>
      </html>
    `;
}
