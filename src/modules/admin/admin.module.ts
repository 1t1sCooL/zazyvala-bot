import { Module } from '@nestjs/common';
import { AssistantsModule } from '../assistants';
import { MembersModule } from '../members';
import { SettingsModule } from '../settings';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminController } from './admin.controller';
import { AdminUiController } from './admin-ui.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [SettingsModule, AssistantsModule, MembersModule],
  controllers: [AdminController, AdminUiController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
