import { migrate } from "postgres-migrations"

async function migrations () {
  const user = process.env.POSTGRES_USER ?? "crosslistr"
  const password = process.env.POSTGRES_PASSWORD ?? "crosslistr"
  const database = process.env.POSTGRES_DB ?? "crosslistr_db"
  const host = process.env.DB_HOST ?? "postgres"
  const port = Number(process.env.DB_PORT ?? 5432)

  const dbConfig = {
    database,
    user,
    password,
    host,
    port,
    ensureDatabaseExists: true,
    defaultDatabase: "postgres"
  }

  await migrate(dbConfig, "./sql")
}

migrations();
