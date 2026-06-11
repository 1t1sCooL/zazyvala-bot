import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { LANGS } from '../i18n';
import { CALL_POLICIES } from '../summon';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  header?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86400)
  cooldownSec?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  mentionsPerBatch?: number;

  @IsOptional()
  @IsIn(CALL_POLICIES as unknown as string[])
  callPolicy?: string;

  @IsOptional()
  @IsIn(LANGS as unknown as string[])
  language?: string;
}

export class AddAssistantDto {
  @IsString()
  userId!: string;
}

export class AddMemberDto {
  @IsString()
  @Matches(/^@?[A-Za-z0-9_]{5,32}$/, {
    message: 'username must be 5-32 chars: latin letters, digits, underscore',
  })
  username!: string;
}
