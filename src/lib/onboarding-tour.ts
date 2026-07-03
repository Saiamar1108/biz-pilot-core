import type { Step } from "react-joyride";

export const ONBOARDING_OPEN_NAV_EVENT = "shoppilot:onboarding-open-nav";
export const ONBOARDING_CLOSE_NAV_EVENT = "shoppilot:onboarding-close-nav";
export const ONBOARDING_START_DELAY_MS = 800;
export const ONBOARDING_TARGET_WAIT_MS = 1200;

export const onboardingTargetIds = {
  dashboardOverview: "shop-pilot-tour-dashboard-overview",
  productsNav: "shop-pilot-tour-products-nav",
  customersNav: "shop-pilot-tour-customers-nav",
  invoicesNav: "shop-pilot-tour-invoices-nav",
  analyticsNav: "shop-pilot-tour-analytics-nav",
  notifications: "shop-pilot-tour-notifications",
  settingsNav: "shop-pilot-tour-settings-nav",
  createProduct: "shop-pilot-tour-create-product",
} as const;

export const onboardingSteps: Step[] = [
  {
    target: `#${onboardingTargetIds.dashboardOverview}`,
    content: "Welcome to ShopPilot. This is your business dashboard.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: `#${onboardingTargetIds.productsNav}`,
    content: "Click here to manage products.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: `#${onboardingTargetIds.customersNav}`,
    content: "Here you can manage your customers.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: `#${onboardingTargetIds.invoicesNav}`,
    content: "Create and manage invoices here.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: `#${onboardingTargetIds.analyticsNav}`,
    content: "Track your sales and growth here.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: `#${onboardingTargetIds.notifications}`,
    content: "Manage reminders and notifications here.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: `#${onboardingTargetIds.settingsNav}`,
    content: "Customize your business settings here.",
    placement: "right",
    disableBeacon: true,
  },
  {
    target: `#${onboardingTargetIds.createProduct}`,
    content: "Start by creating your first product.",
    placement: "bottom",
    disableBeacon: true,
  },
];

export const createProductStepIndex = onboardingSteps.length - 1;
