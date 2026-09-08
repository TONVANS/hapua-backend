import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { DelegationService } from '../modules/delegation/delegation.service';
import { RegisterActivityDto } from '../modules/delegation/dto/register-activity.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Public - Registration')
@Controller('public/registration')
@Public()
export class PublicRegistrationController {
  constructor(private readonly delegationService: DelegationService) {}

  @Get('delegation/:code')
  checkDelegation(@Param('code') code: string) {
    return this.delegationService.findByCode(code);
  }

  @Post('activity')
  registerForActivity(@Body() registerDto: RegisterActivityDto) {
    return this.delegationService.registerForActivity(registerDto);
  }
}
