import { Airtable } from 'airtable';
import { airtable } from 'src/db/airtable.ts';
import { config } from 'deps.ts';

const env = config();
const AtApi = {
    hostname: `https://api.airtable.com/v0/`,
    endpoints: {
        baseSchema: `meta/bases/{baseId}/tables`
    }
};

const AtPatToken = env.ATBL_PAT;

const db = {
    userTable: {
        baseTblPath: env.ATBL_USR_DB_PATH
    }
}
console.log({ AtPatToken, AtApi, env, db });
const kk = process.env.