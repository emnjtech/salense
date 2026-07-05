import { IsEnum } from "class-validator";
import { StorePlatform } from "../../store-integrations/types/store-platform.enum.js";

export class PlatformParamDto {
  @IsEnum(StorePlatform)
  declare readonly platform: StorePlatform;
}
