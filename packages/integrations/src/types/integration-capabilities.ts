export interface IntegrationCapabilities {
  readonly supportsOfficialAuthentication: boolean;
  readonly supportsOrders: boolean;
  readonly supportsProducts: boolean;
  readonly supportsCustomers: boolean;
  readonly supportsInventory: boolean;
  readonly supportsCategories: boolean;
  readonly supportsRefunds: boolean;
  readonly supportsManualSynchronisation: boolean;
  readonly supportsScheduledSynchronisation: boolean;
  readonly readOnly: true;
}

export const READ_ONLY_COMMERCE_CAPABILITIES: IntegrationCapabilities = Object.freeze({
  supportsOfficialAuthentication: true,
  supportsOrders: true,
  supportsProducts: true,
  supportsCustomers: true,
  supportsInventory: true,
  supportsCategories: true,
  supportsRefunds: true,
  supportsManualSynchronisation: true,
  supportsScheduledSynchronisation: true,
  readOnly: true,
});
