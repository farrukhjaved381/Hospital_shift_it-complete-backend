import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

function setupSwagger(app: INestApplication): any {
  const config = new DocumentBuilder()
    .setTitle('Hospital Project API')
    .setDescription('The API documentation for the Hospital Project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const document = setupSwagger(app);
  app.use('/docs-json', (req, res) => {
    res.send(document);
  });

  await app.listen(3001);
}
bootstrap();
