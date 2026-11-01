import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

let appInstance: any = null;

export async function createNestServer() {
  if (!appInstance) {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
      origin: true,
      credentials: true,
    });
    await app.init();
    appInstance = app.getHttpAdapter().getInstance();
  }
  return appInstance;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  const port = process.env.PORT ?? 4300;
  await app.listen(port);
  console.log(`Carneiz server running on port ${port}`);
}

// Only listen on port if not running in a serverless environment (like Vercel)
if (!process.env.VERCEL) {
  await bootstrap();
}

// Handler for Vercel Serverless Function
export default async function handler(req: any, res: any) {
  const server = await createNestServer();
  return server(req, res);
}

