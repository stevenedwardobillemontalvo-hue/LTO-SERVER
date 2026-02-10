import { Sequelize } from "sequelize";

const DB = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASS!,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    ssl: process.env.DB_SSL === "true",
    dialectOptions: {
      ssl: process.env.DB_SSL === "true"
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
    logging: false,
  }
);

export default DB;