import Image from "next/image";
import { StorePlatform } from "../../lib/api/store-integrations-client";

const platformIconPaths: Record<StorePlatform, string> = {
  [StorePlatform.AmazonSeller]: "/platforms/amazon-seller.svg",
  [StorePlatform.Shopify]: "/platforms/shopify.svg",
  [StorePlatform.TikTokShop]: "/platforms/tiktok-shop.svg",
  [StorePlatform.WooCommerce]: "/platforms/woocommerce.svg",
};

const iconSizePixels = {
  sm: 24,
  md: 30,
  lg: 42,
} as const;

export function PlatformIcon({
  platform,
  size = "md",
}: {
  readonly platform: StorePlatform;
  readonly size?: "sm" | "md" | "lg";
}) {
  const pixelSize = iconSizePixels[size];

  return (
    <span className={`platform-logo platform-logo-${size}`} aria-hidden="true">
      <Image alt="" height={pixelSize} src={platformIconPaths[platform]} width={pixelSize} />
    </span>
  );
}
