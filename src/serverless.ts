import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

let cachedServer: express.Express | null = null;

async function bootstrapServer(): Promise<express.Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create(AppModule, adapter);
  configureApp(app);
  await app.init();
  cachedServer = app.getHttpAdapter().getInstance() as express.Express;
  return cachedServer;
}

export async function createServer() {
  return bootstrapServer();
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
