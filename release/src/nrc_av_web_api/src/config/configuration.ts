export const configuration = () => ({
  port: Number(process.env.SERVER_PORT) || 4000,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || '1234',
    name: process.env.DATABASE_NAME || 'nissan'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    expirationTime: Number(process.env.JWT_EXPIRATION_TIME) || 3600
  },
  client: {
    clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').split(',')
  }
});
