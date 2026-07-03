import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { WooCommerceApiVersion } from "@salense/integrations";

export class WooCommerceConnectionCredentialsDto {
  @IsString()
  @IsNotEmpty()
  declare readonly consumerKey: string;

  @IsString()
  @IsNotEmpty()
  declare readonly consumerSecret: string;

  @IsEnum(WooCommerceApiVersion)
  declare readonly apiVersion: WooCommerceApiVersion;
}
