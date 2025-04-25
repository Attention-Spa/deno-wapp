export function validatePassword(password: string): string | null {
    const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{10,}$/;
    if (!regex.test(password)) {
      return "Password must be at least 10 characters long and include at least one number and one special character.";
    }
    return null;
  }
  