import { Airtable } from "https://deno.land/x/airtable@v0.1.0/mod.ts";
import { config } from "../deps.ts";

const env = await config();
const [BaseId, TableName] = env.AIRTABLE_UsersDb_Users_PATH.split("/");

const airtable = new Airtable({
  apiKey: env.AIRTABLE_ROOT_KEY,
  endpointUrl: "https://api.airtable.com/v0",
}).base(BaseId);

const table = airtable.table(TableName);

export async function findUserByEmail(email: string) {
  const formula = `LOWER({email}) = '${email.toLowerCase()}'`;
  const result = await (await table.select({ filterByFormula: formula })).records;
  if (result.length > 0) {
    return result[0].fields;
  }
  console.log("findUserByEmail", { email,result });
  if (result.length === 0) {
    return result || null;
  }
};

export async function createUser({
  email,
  passwordHash,
  log,
}: {
  email: string;
  passwordHash: string;
  log: string;
}) {
  return await table.create({ email, passwordHash, log }, { typecast: true });
};