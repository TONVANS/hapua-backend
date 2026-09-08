import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { TravelService } from '../modules/travel/travel.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Public - Travel')
@Controller('public/travel')
@Public()
export class PublicTravelController {
  constructor(private readonly travelService: TravelService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get paginated list of recommended travel attractions with gallery images for delegates and public view',
  })
  @ApiResponse({
    status: 200,
    description:
      'List of travel recommendations with nested gallery images.',
  })
  findAll(@Query() query: PaginationQueryDto) {
    return this.travelService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get detailed information of a recommended travel attraction including gallery images',
  })
  @ApiParam({ name: 'id', description: 'Travel recommendation UUID' })
  @ApiResponse({
    status: 200,
    description:
      'Travel attraction details with nested gallery images.',
  })
  @ApiResponse({ status: 404, description: 'Travel record not found.' })
  findOne(@Param('id') id: string) {
    return this.travelService.findOne(id);
  }
}
