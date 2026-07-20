import { IsIn, IsOptional, IsString } from "class-validator";

export class ListAdminInvitationsQueryDto {
  @IsIn(["active", "archived"])
  @IsOptional()
  readonly view?: "active" | "archived";

  @IsOptional()
  @IsString()
  readonly status?: string;

  @IsOptional()
  @IsString()
  readonly search?: string;

  @IsOptional()
  @IsString()
  readonly preferredPlan?: string;

  @IsOptional()
  @IsString()
  readonly platform?: string;

  @IsOptional()
  @IsString()
  readonly submittedFrom?: string;

  @IsOptional()
  @IsString()
  readonly submittedTo?: string;

  @IsOptional()
  @IsString()
  readonly archivedFrom?: string;

  @IsOptional()
  @IsString()
  readonly archivedTo?: string;
}
