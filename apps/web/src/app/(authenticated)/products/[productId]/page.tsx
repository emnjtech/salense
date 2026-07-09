import { ProductDetailWorkspace } from "../../../../components/products/product-detail-workspace";

interface ProductDetailPageProps {
  readonly params: Promise<{
    readonly productId: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = await params;

  return <ProductDetailWorkspace productId={productId} />;
}
