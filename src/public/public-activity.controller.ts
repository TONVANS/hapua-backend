import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActivityService } from '../modules/activity/activity.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Public - Activity')
@Controller('public/activities')
@Public()
export class PublicActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('agenda')
  getAgenda() {
    return this.activityService.getAgenda();
  }

  @Get()
  findAllPublic(@Query() query: PaginationQueryDto) {
    return this.activityService.findAllPublic(query);
  }

  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.activityService.findOnePublic(id);
  }
}
