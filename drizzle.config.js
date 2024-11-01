/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      url: 'postgresql://ai-interview-mocker_owner:tLbpcRyzxw50@ep-spring-bonus-a59y3mw3.us-east-2.aws.neon.tech/ai-interview-mocker?sslmode=require',
    }
  };