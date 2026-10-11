
import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 4000),

  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/company_instrument',

  jwtSecret:
    process.env.JWT_SECRET ||
    'dev-secret-change-me',

  clientUrl:
    process.env.CLIENT_URL ||
    'http://localhost:3000',

  nodeEnv:
    process.env.NODE_ENV ||
    'development',
};

