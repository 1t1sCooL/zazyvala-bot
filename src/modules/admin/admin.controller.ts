import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminService } from './admin.service';
import { AddAssistantDto, AddMemberDto, UpdateSettingsDto } from './dto';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  getStats() {
    return this.admin.getStats();
  }

  @Get('chats')
  listChats() {
    return this.admin.listChats();
  }

  @Get('chats/:id')
  getChat(@Param('id') id: string) {
    return this.admin.getChatDetail(BigInt(id));
  }

  @Get('chats/:id/members')
  listMembers(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.admin.listMembers(
      BigInt(id),
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Post('chats/:id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.admin.addMemberByUsername(BigInt(id), dto.username);
  }

  @Delete('chats/:id/members/pending/:username')
  removePendingMember(
    @Param('id') id: string,
    @Param('username') username: string,
  ) {
    return this.admin.removePendingMember(BigInt(id), username);
  }

  @Patch('chats/:id/settings')
  updateSettings(@Param('id') id: string, @Body() dto: UpdateSettingsDto) {
    return this.admin.updateSettings(BigInt(id), dto);
  }

  @Get('chats/:id/assistants')
  listAssistants(@Param('id') id: string) {
    return this.admin.listAssistants(BigInt(id));
  }

  @Post('chats/:id/assistants')
  addAssistant(@Param('id') id: string, @Body() dto: AddAssistantDto) {
    return this.admin.addAssistant(BigInt(id), BigInt(dto.userId));
  }

  @Delete('chats/:id/assistants/:userId')
  removeAssistant(@Param('id') id: string, @Param('userId') userId: string) {
    return this.admin.removeAssistant(BigInt(id), BigInt(userId));
  }
}
