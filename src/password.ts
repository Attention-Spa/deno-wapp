export function validatePassword(password: string): string | null | Error {

  if (!password) return new Error("Password cannot be blank.");
  else if (password.length < 10) return new Error("Password must be at least 10 characters long.");
  else if (!password.match(/\d/)) return Error("Password must contain at least one number")
  else if (!password.match(/[^\w\d\pL]/)) return new Error("Password must contain at least one special character.");

  else return password;
}
