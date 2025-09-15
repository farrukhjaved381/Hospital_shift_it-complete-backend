import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v', // This will result in routes like /api/v1/resource
  });

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Automatically remove properties that are not defined in the DTO
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are provided
      transform: true, // Automatically transform payloads to be objects of their DTO classes
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit conversion of types based on TS metadata
      },
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Hospital Project API')
    .setDescription('The API documentation for the Hospital Project')
    .setVersion('1.0')
    .addBearerAuth() // Enable JWT authentication in Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger UI will be available at /api

  // Enable CORS for frontend integration
  app.enableCors();

  await app.listen(3000); // Listen on port 3000
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger UI is available at: ${await app.getUrl()}/api`);
}
bootstrap();
