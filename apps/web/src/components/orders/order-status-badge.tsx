import { formatOrderStatus, getOrderStatusClassName } from "./order-status";

export {
  formatOrderStatus,
  getOrderStatusClassName,
  isRevenueEligibleOrderStatus,
} from "./order-status";

export function OrderStatusBadge({ status }: { readonly status: string | null }) {
  return (
    <span className={`order-status ${getOrderStatusClassName(status)}`}>
      {formatOrderStatus(status)}
    </span>
  );
}
