import { config } from "../deps.ts";
const env = await config({ path: `D:\\New folder\\.env` });
const airtableApiKey = env.AIRTABLE_ROOT_KEY;
const UserDbPath = env.AIRTABLE_UsersDb_Users_PATH;
const [BaseId, TblId] = UserDbPath.split('/');




export async function checkEmailExists(airtable: { read: (query: object) => Promise<{ id: string; fields: Record<string, unknown> }[]> }, email: string): Promise<boolean> {
  const result = await airtable.read({ filterByFormula: `{email} = "${email}"` });
  return result.length > 0;
}


if (!airtableApiKey || !BaseId) {
  console.error("Missing required Airtable environment variables.");
  console.error("Exiting due to missing environment variables.");
  Deno.exit(1);
}

export async function findUserByUsername(username: string) {
  const url = `https://api.airtable.com/v0/${UserDbPath}?filterByFormula={username}="${encodeURIComponent(username)}"`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${airtableApiKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  return data.records?.[0] || null;
}



export async function createUser({ email, passwordHash, log, username }: { email: string; passwordHash: string; log: string; username: string }) {



  if (!BaseId) {
    const url = `https://api.airtable.com/v0/${UserDbPath}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${airtableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              email,
              passwordHash,
              username: username ?? `${email}`.split('@')?.[0],
              log
            },
          },
        ],
      }),
    });

    const data = await res.json();
    return data.records?.[0];
  }
}