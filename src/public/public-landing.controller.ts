import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ActivityService } from '../modules/activity/activity.service';
import { HotelService } from '../modules/hotel/hotel.service';
import { TravelService } from '../modules/travel/travel.service';
import { PrismaService } from '../prisma/prisma.service';
import { SortOrder } from '../common/dto/pagination-query.dto';

@ApiTags('Public - Landing Overview')
@Controller('public/landing')
@Public()
export class PublicLandingController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly hotelService: HotelService,
    private readonly travelService: TravelService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getLandingOverview() {
    const [
      activitiesResult,
      hotelsResult,
      travelResult,
      totalDelegates,
      totalCountries,
      totalOrgs,
    ] = await Promise.all([
      this.activityService.findAllPublic({
        limit: 4,
        page: 1,
        sortBy: 'date',
        sortOrder: SortOrder.ASC,
      }),
      this.hotelService.findAll({
        limit: 6,
        page: 1,
        sortBy: 'starRating',
        sortOrder: SortOrder.DESC,
      }),
      this.travelService.findAll({
        limit: 6,
        page: 1,
        sortBy: 'createdAt',
        sortOrder: SortOrder.DESC,
      }),
      this.prisma.delegation.count().catch(() => 0),
      this.prisma.country.count().catch(() => 0),
      this.prisma.organization.count().catch(() => 0),
    ]);

    return {
      stats: {
        memberStates: totalCountries > 0 ? totalCountries : 10,
        accreditedDelegates: totalDelegates > 0 ? totalDelegates : 500,
        powerUtilities: totalOrgs > 0 ? totalOrgs : 50,
        eventDays: 5,
      },
      featuredActivities: activitiesResult.data || [],
      featuredHotels: hotelsResult.data || [],
      featuredTravel: travelResult.data || [],
    };
  }
}
