import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN! });
console.log((await c.execute("select id,email,role,company_id from user where email like '%test%'")).rows);
console.log((await c.execute("select id,name,archived_at from companies")).rows);
