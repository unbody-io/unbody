import { ValidationPipe } from '@nestjs/common'
import { NestFactory, Reflector } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import * as bodyParser from 'body-parser'
import helmet from 'helmet'
import { AppModule } from './App.module'
import { ConfigService, FormatResponseInterceptor } from './lib/nestjs-utils'

const rawBody = (req: any, res: any, buf: Buffer, encoding: any) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8')
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()

  app.use(helmet({}))
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
    }),
  )

  const configService = app.get(ConfigService)

  app.setGlobalPrefix(configService.get<string>('server.globalPrefix') || '')
  app.useGlobalInterceptors(
    new FormatResponseInterceptor(app.get(Reflector)) as any,
  )

  app.use(bodyParser.urlencoded({ verify: rawBody, extended: true }))
  app.use(
    bodyParser.json({
      verify: rawBody,
      limit: 52428800, // 50MB
    }),
  )

  // setup swagger
  if (!!Number(configService.get<string>('swagger.active'))) {
    const options = new DocumentBuilder()
      .setTitle('Unbody')
      .setDescription(`Unbody`)
      .addBearerAuth({ in: 'header', type: 'http' }, 'Authorization')
      .setVersion('1.0')
      .build()

    const document = SwaggerModule.createDocument(app, options)
    SwaggerModule.setup(
      configService.get('swagger.path') || '/swagger',
      app,
      document,
    )
  }

  await app.listen(
    configService.get<string>('server.port')!,
    configService.get<string>('server.hostname')!,
  )
}
bootstrap()
