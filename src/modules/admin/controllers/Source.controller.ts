import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ConnectSourceDto } from '../dto/ConnectSource.dto'
import { CreateSourceDto } from '../dto/CreateSource.dto'
import { ListEntrypointOptionsDto } from '../dto/ListEntrypointOptions.dto'
import { SetEntrypointDto } from '../dto/SetEntrypoint.dto'
import { VerifySourceConnectionDto } from '../dto/VerifySourceConnection.dto'
import { SourceService } from '../services/Source.service'

@ApiTags('Admin API')
@Controller('/admin/projects/:projectId/sources')
export class SourceController {
  constructor(private sourceService: SourceService) {}

  @Get('/')
  async listSources() {
    return this.sourceService.listSources()
  }

  @Post('/')
  async create(@Body() body: CreateSourceDto) {
    return this.sourceService.create({ body })
  }

  @Delete('/:id/')
  async delete(@Param('id') sourceId: string) {
    return this.sourceService.delete({ sourceId })
  }

  @Post('/:id/connect')
  async connect(@Param('id') sourceId: string, @Body() body: ConnectSourceDto) {
    return this.sourceService.connect({ sourceId, body })
  }

  @Patch('/:id/verify-connection')
  async verifyConnection(
    @Param('id') sourceId: string,
    @Body() body: VerifySourceConnectionDto,
  ) {
    return this.sourceService.verifyConnection({ sourceId, body })
  }

  @Post('/:id/list-entrypoint-options')
  async listEntrypointOptions(
    @Param('id') sourceId: string,
    @Body() body: ListEntrypointOptionsDto,
  ) {
    return this.sourceService.listEntrypoints({ sourceId, body })
  }

  @Patch('/:id/set-entrypoint')
  async setEntrypoint(
    @Param('id') sourceId: string,
    @Body() body: SetEntrypointDto,
  ) {
    return this.sourceService.setEntrypoint({ sourceId, body })
  }

  @Post('/:id/indexing/init')
  async initSource(@Param('id') sourceId: string) {
    return this.sourceService.initSource({ sourceId })
  }

  @Post('/:id/indexing/rebuild')
  async rebuildSource(@Param('id') sourceId: string) {
    return this.sourceService.initSource({ sourceId })
  }

  @Post('/:id/indexing/update')
  async updateSource(@Param('id') sourceId: string) {
    return this.sourceService.updateSource({ sourceId })
  }
}
