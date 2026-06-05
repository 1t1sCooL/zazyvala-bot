import { Module } from '@nestjs/common';
import { AssistantsModule } from '../assistants';
import { SettingsModule } from '../settings';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminController } from './admin.controller';
import { AdminUiController } from './admin-ui.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [SettingsModule, AssistantsModule],
  controllers: [AdminController, AdminUiController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
