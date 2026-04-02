import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get() @ApiOperation({ summary: 'Gateway health check' })
  check() { return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() }; }
}
