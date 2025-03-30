import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBody, ApiTags } from '@nestjs/swagger'
import { ProjectService } from '../services/Project.service'
import { CreateProjectDto } from '../dto/CreateProject.dto'
import { Result } from 'src/lib/core-utils/result'

@ApiTags('Admin API')
@Controller('/admin/projects/')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Post('/')
  @ApiBody({
    type: CreateProjectDto,
    required: false,
    description: 'Project creation parameters',
  })
  async create(@Body() body: CreateProjectDto) {
    const result = await this.projectService.createProject({ body })
    return Result.match(result, {
      ok: (value) => {
        return {
          project: {
            id: value._id,
            name: value.name,
            state: value.state,
            settings: value.settings,
          },
        }
      },
      err: (error) => {
        switch (error.type) {
          case 'project-exists':
            throw new ConflictException(error.message)
        }
      },
    })
  }

  @Delete('/:id')
  async delete(
    // About keepSources:
    // This is a temporary hack to allow for a clean restart of the project without having to re-initialize its sources.
    // It is meant to improve DX in the near term, and not as a permanent solution.
    @Query('keepSources') keepSources: boolean,
    @Query('exit') exit: boolean,
  ) {
    return this.projectService.deleteProject({
      projectId: 'default',
      keepSources,
      exit,
    })
  }
}
