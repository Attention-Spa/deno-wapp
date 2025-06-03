import { RouterContext } from "https://deno.land/x/oak@v6.5.0/mod.ts";
import { airtable as db } from "./db/airtable.ts";
import { fullyLoadAirtableRecord as loadRecord } from "./db/loadDbRecord.ts";

interface User {
    email: string;
    username: string;
    passwordHash: string;
};

interface UserRecord extends User {
    id: string;
    log: string;
}


const UserTbl = db.table('Users');

const searchUser = async (params: Partial<User>) => {

    if (!params || typeof params !== 'object')
        throw new TypeError(`Cannot search for a user without some identifying params.`);


    const fldsToLoad = ['email', 'username', 'passwordHash', 'log'];

    const query = await UserTbl.select({
        fields: fldsToLoad,
        cellFormat: 'json', maxRecords: 500, pageSize: 100,
        filterByFormula: `LOWER({email}) = '${params.email?.toLowerCase()}'`
    });

    const records = query.records?.map(r => loadRecord(r, Object.assign(UserTbl, { fields: UserTbl })))

};

const createUser = async (ctx: RouterContext) => {
    const { email, username, passwordHash, log } = await ctx.request.body().value;
    const user: User = {
        email,
        username,
        passwordHash,
        log,
    };
    const id = await UserTbl.create(user, { typecast: true });
    ctx.response.status = 201;
    ctx.response.body = { id, ...user };
};

