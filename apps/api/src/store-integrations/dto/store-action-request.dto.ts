import { IsString, IsNotEmpty } from "class-validator";

export class StoreActionRequestDto {
  @IsString()
  @IsNotEmpty()
  declare readonly storeId: string;
}
