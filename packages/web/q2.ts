import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN! });
for (const tbl of ["companies","user","tanks","helicopters","movements","drain_checks"]) {
  const r = await c.execute(`select count(*) as n from ${tbl}`);
  console.log(tbl, r.rows[0].n);
}
console.log((await c.execute("select id,email,role,company_id from user")).rows.map((r:any)=>`${r.email} | ${r.role} | ${r.company_id}`));
