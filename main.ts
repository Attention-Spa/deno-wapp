// main.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getCookies, setCookie, deleteCookie } from "https://deno.land/std@0.208.0/http/cookie.ts";

// Airtable configuration
const AIRTABLE_API_KEY = Deno.env.get("AIRTABLE_API_KEY") || "your_airtable_api_key_here";
const AIRTABLE_BASE_ID = Deno.env.get("AIRTABLE_BASE_ID") || "your_base_id_here";
const AIRTABLE_TABLE_NAME = "Users"; // Your table name in Airtable

// Password hashing configuration
const SALT_LENGTH = 32;
const HASH_ITERATIONS = 100000;

// Simple session store (in production, use Redis or database)
const sessions = new Map<string, { userId: string; email: string }>();

// Generate simple session ID
function generateSessionId(): string {
  return crypto.randomUUID();
}

// Generate a random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Hash password with salt using PBKDF2
async function hashPassword(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Generate salt if not provided
  if (!salt) {
    salt = generateSalt();
  }
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: HASH_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256 // 32 bytes
  );
  
  return {
    hash: bufferToHex(hashBuffer),
    salt: bufferToHex(salt)
  };
}

// Verify password against stored hash
async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
  try {
    const salt = hexToBuffer(storedSalt);
    const { hash } = await hashPassword(password, salt);
    return hash === storedHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

// Verify user credentials against Airtable
async function verifyUser(email: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Email}="${email}"`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Airtable API error:', response.status);
      return false;
    }

    const data = await response.json();
    
    if (data.records && data.records.length > 0) {
      const user = data.records[0].fields;
      // Verify password using stored hash and salt
      if (user.PasswordHash && user.PasswordSalt) {
        return await verifyPassword(password, user.PasswordHash, user.PasswordSalt);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying user:', error);
    return false;
  }
}

// Create new user (for signup functionality)
async function createUser(email: string, password: string): Promise<boolean> {
  try {
    // Hash the password
    const { hash, salt } = await hashPassword(password);
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Email: email,
            PasswordHash: hash,
            PasswordSalt: salt
          }
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

// Utility function to migrate plaintext password to hashed (if needed)
async function migratePasswordToHash(recordId: string, plaintextPassword: string): Promise<boolean> {
  try {
    const { hash, salt } = await hashPassword(plaintextPassword);
    
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            PasswordHash: hash,
            PasswordSalt: salt,
            Password: null // Clear the plaintext password
          }
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error migrating password:', error);
    return false;
  }
}

// Check if user is authenticated
function isAuthenticated(request: Request): { authenticated: boolean; user?: { userId: string; email: string } } {
  const cookies = getCookies(request.headers);
  const sessionId = cookies.sessionId;
  
  if (sessionId && sessions.has(sessionId)) {
    return { authenticated: true, user: sessions.get(sessionId) };
  }
  
  return { authenticated: false };
}

const homePageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cyberpunk Portal</title>
  <style>
    :root {
      --bg-color: #0a0a0f;
      --text-color: #e0e0ff;
      --primary: #ff00cc;
      --secondary: #00ffff;
      --hover-glow: 0 0 10px #ff00cc, 0 0 20px #00ffff;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
    }

    .nav {
      width: 100%;
      max-width: 800px;
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      padding: 1rem;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: 2rem;
      backdrop-filter: blur(6px);
    }

    .nav a {
      color: var(--secondary);
      text-decoration: none;
      font-weight: bold;
      transition: all 0.2s ease-in-out;
    }

    .nav a:hover {
      color: var(--primary);
      text-shadow: var(--hover-glow);
    }

    .container {
      background-color: rgba(255, 255, 255, 0.03);
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
      max-width: 800px;
      width: 100%;
    }

    h1 {
      color: var(--primary);
      text-shadow: var(--hover-glow);
    }

    p {
      line-height: 1.6;
    }

    .btn {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: #000;
      padding: 0.8rem 1.5rem;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      text-decoration: none;
      font-weight: bold;
      margin-right: 10px;
      transition: all 0.3s ease;
    }

    .btn:hover {
      box-shadow: var(--hover-glow);
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <nav class="nav">
    <a href="/">Home</a>
    <a href="/members">Members</a>
    <a href="/login">Login</a>
    <a href="/signup">Sign Up</a>
    <a href="/logout">Logout</a>
  </nav>

  <div class="container">
    <h1>👾 Welcome, Net Runner</h1>
    <p>This is your gateway to the grid. Public access granted. Proceed with caution.</p>
    <p>Log in to access restricted zones. New users can jack in via secure registration.</p>
    <p><strong>🔐 Security Protocol:</strong> Encrypted credentials, salted and hashed using PBKDF2. No plaintext vulnerabilities.</p>
    <a href="/members" class="btn">Access Grid</a>
    <a href="/login" class="btn">Log In</a>
    <a href="/signup" class="btn">Jack In</a>
  </div>
</body>
</html>
`;


const membersPageHTML = (user: { email: string }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Members Area - Deno Auth Demo</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .nav { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #333; font-weight: bold; }
        .nav a:hover { color: #007acc; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .user-info { background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .btn { background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
        .btn:hover { background: #c82333; }
    </style>
</head>
<body>
    <nav class="nav">
        <a href="/">Home</a>
        <a href="/members">Members</a>
        <a href="/signup">Sign Up</a>
        <a href="/logout">Logout</a>
    </nav>
    
    <div class="container">
        <h1>🔒 Members Only Area</h1>
        <div class="user-info">
            <strong>Welcome, ${user.email}!</strong><br>
            You have successfully logged in and can access this protected content.
        </div>
        
        <h2>Exclusive Content</h2>
        <p>This is premium content only available to authenticated members.</p>
        <ul>
            <li>Member resources</li>
            <li>Private downloads</li>
            <li>Community access</li>
            <li>Special offers</li>
        </ul>
        
        <a href="/logout" class="btn">Logout</a>
    </div>
</body>
</html>
`;

const loginPageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Deno Auth Demo</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .nav { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #333; font-weight: bold; }
        .nav a:hover { color: #007acc; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .btn { background: #007acc; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #005999; }
        .btn-secondary { background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin-left: 10px; }
        .btn-secondary:hover { background: #5a6268; }
        .error { color: #dc3545; margin-top: 10px; }
        .setup-info { background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <nav class="nav">
        <a href="/">Home</a>
        <a href="/members">Members</a>
        <a href="/login">Login</a>
        <a href="/signup">Sign Up</a>
    </nav>
    
    <div class="container">
        <h1>Login</h1>
        
        <div class="setup-info">
            <strong>Security Update:</strong> Passwords are now securely hashed! Your Airtable base needs "Email", "PasswordHash", and "PasswordSalt" fields.
        </div>
        
        <form method="POST" action="/login">
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
            </div>
            
            <button type="submit" class="btn">Login</button>
            <a href="/signup" class="btn-secondary">New User? Sign Up</a>
        </form>
    </div>
</body>
</html>
`;

const signupPageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - Deno Auth Demo</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .nav { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
        .nav a { margin-right: 15px; text-decoration: none; color: #333; font-weight: bold; }
        .nav a:hover { color: #007acc; }
        .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        .btn { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #218838; }
        .btn-secondary { background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin-left: 10px; }
        .btn-secondary:hover { background: #5a6268; }
        .error { color: #dc3545; margin-top: 10px; }
        .success { color: #28a745; margin-top: 10px; }
        .security-info { background: #d4edda; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <nav class="nav">
        <a href="/">Home</a>
        <a href="/members">Members</a>
        <a href="/login">Login</a>
        <a href="/signup">Sign Up</a>
    </nav>
    
    <div class="container">
        <h1>Create Account</h1>
        
        <div class="security-info">
            <strong>🔒 Secure Signup:</strong> Your password will be securely hashed using PBKDF2 with 100,000 iterations and stored safely.
        </div>
        
        <form method="POST" action="/signup">
            <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required minlength="8">
                <small>Minimum 8 characters</small>
            </div>
            
            <div class="form-group">
                <label for="confirmPassword">Confirm Password:</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required>
            </div>
            
            <button type="submit" class="btn">Create Account</button>
            <a href="/login" class="btn-secondary">Already have an account? Login</a>
        </form>
    </div>
    
    <script>
        // Simple client-side password confirmation
        document.querySelector('form').addEventListener('submit', function(e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match!');
            }
        });
    </script>
</body>
</html>
`;

// Main request handler
async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle routes
  switch (path) {
    case "/": {
      return new Response(homePageHTML, {
        headers: { "content-type": "text/html" },
      });
    }

    case "/members": {
      const auth = isAuthenticated(request);
      if (!auth.authenticated) {
        return new Response(null, {
          status: 302,
          headers: { "Location": "/login" },
        });
      }
      return new Response(membersPageHTML(auth.user!), {
        headers: { "content-type": "text/html" },
      });
    }

    case "/login": {
      if (request.method === "GET") {
        return new Response(loginPageHTML, {
          headers: { "content-type": "text/html" },
        });
      } else if (request.method === "POST") {
        const formData = await request.formData();
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        if (await verifyUser(email, password)) {
          const sessionId = generateSessionId();
          sessions.set(sessionId, { userId: email, email });

          const response = new Response(null, {
            status: 302,
            headers: { "Location": "/members" },
          });

          setCookie(response.headers, {
            name: "sessionId",
            value: sessionId,
            maxAge: 60 * 60 * 24, // 24 hours
            httpOnly: true,
            secure: true, // HTTPS in Deno Deploy
            sameSite: "Strict",
          });

          return response;
        } else {
          return new Response(
            loginPageHTML.replace("</form>", '<div class="error">Invalid email or password</div></form>'),
            {
              headers: { "content-type": "text/html" },
              status: 401,
            }
          );
        }
      }
      break;
    }

    case "/signup": {
      if (request.method === "GET") {
        return new Response(signupPageHTML, {
          headers: { "content-type": "text/html" },
        });
      } else if (request.method === "POST") {
        const formData = await request.formData();
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Basic validation
        if (password !== confirmPassword) {
          return new Response(
            signupPageHTML.replace("</form>", '<div class="error">Passwords do not match</div></form>'),
            {
              headers: { "content-type": "text/html" },
              status: 400,
            }
          );
        }

        if (password.length < 8) {
          return new Response(
            signupPageHTML.replace("</form>", '<div class="error">Password must be at least 8 characters</div></form>'),
            {
              headers: { "content-type": "text/html" },
              status: 400,
            }
          );
        }

        try {
          const success = await createUser(email, password);
          if (success) {
            return new Response(
              signupPageHTML.replace("</form>", '<div class="success">Account created successfully! <a href="/login">Login here</a></div></form>'),
              {
                headers: { "content-type": "text/html" },
              }
            );
          } else {
            return new Response(
              signupPageHTML.replace("</form>", '<div class="error">Failed to create account. Email may already exist.</div></form>'),
              {
                headers: { "content-type": "text/html" },
                status: 400,
              }
            );
          }
        } catch (error) {
          return new Response(
            signupPageHTML.replace("</form>", '<div class="error">Server error. Please try again.</div></form>'),
            {
              headers: { "content-type": "text/html" },
              status: 500,
            }
          );
        }
      }
      break;
    }

    case "/logout": {
      const cookies = getCookies(request.headers);
      const sessionId = cookies.sessionId;
      
      if (sessionId) {
        sessions.delete(sessionId);
      }

      const response = new Response(null, {
        status: 302,
        headers: { "Location": "/" },
      });

      deleteCookie(response.headers, "sessionId");
      return response;
    }

    default: {
      return new Response("404 Not Found", { status: 404 });
    }
  }

  return new Response("500 Internal Server Error", { status: 500 });
}

// Start the server (Deno Deploy will handle the port)
console.log("Server starting...");
console.log("Make sure to set AIRTABLE_API_KEY and AIRTABLE_BASE_ID environment variables in Deno Deploy");
console.log("Your Airtable base should have a 'Users' table with 'Email', 'PasswordHash', and 'PasswordSalt' fields");

await serve(handler);