import { Body, Controller, Delete, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ProjectService } from '../services/Project.service'

@ApiTags('Admin API')
@Controller('/admin/projects/')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Post('/')
  async create(@Body() body: any) {
    return this.projectService.createProject({ body })
  }

  @Delete('/:id')
  async delete() {
    return this.projectService.deleteProject({ projectId: 'default' })
  }
}
