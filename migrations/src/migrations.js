import { migrate } from "postgres-migrations"

async function migrations () {
  const dbConfig = {
    database: "crosslistr_db",
    user: "crosslistr",
    password: "crosslistr",
    host: "postgres",
    port: 5432,
    ensureDatabaseExists: true,
    defaultDatabase: "crosslistr_db"
  }
  
  await migrate(dbConfig, "./sql")
}

migrations();