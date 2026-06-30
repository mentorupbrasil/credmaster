import { ConfigService } from '@nestjs/config';
import { createNestApp } from './bootstrap';

async function bootstrap() {
  const { app } = await createNestApp();
  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('apiPrefix', 'api');
  const port = config.get<number>('port', 3333);

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`CredMaster API rodando em http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger em http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
