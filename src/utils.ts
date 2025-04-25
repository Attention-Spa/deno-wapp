const IP_ATTEMPT_LIMIT = 5;
const ipAttempts: Record<string, number> = {};

export function getClientIp(req: Request): string {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  return ip;
}

export function isRateLimited(ip: string): boolean {
  return (ipAttempts[ip] || 0) >= IP_ATTEMPT_LIMIT;
}

export function incrementIpAttempts(ip: string): void {
  ipAttempts[ip] = (ipAttempts[ip] || 0) + 1;
}

export function validatePassword(password: string): string | null {
  const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{10,}$/;
  if (!regex.test(password)) {
    return "Password must be at least 10 characters, include a number and a special character.";
  }
  return null;
}
