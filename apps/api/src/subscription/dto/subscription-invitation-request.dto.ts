import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export enum SubscriptionPlan {
  Starter = "STARTER",
  Professional = "PROFESSIONAL",
  Business = "BUSINESS",
}

export enum SubscriptionPlatform {
  Shopify = "SHOPIFY",
  WooCommerce = "WOOCOMMERCE",
  AmazonSeller = "AMAZON_SELLER",
  TikTokShop = "TIKTOK_SHOP",
}

export class SubscriptionInvitationRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  businessName!: string;

  @IsEmail()
  @MaxLength(180)
  workEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  websiteUrl?: string;

  @IsEnum(SubscriptionPlan)
  preferredPlan!: SubscriptionPlan;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(SubscriptionPlatform, { each: true })
  platforms!: SubscriptionPlatform[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
