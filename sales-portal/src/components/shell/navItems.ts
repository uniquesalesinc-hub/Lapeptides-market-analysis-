import type { ComponentType, SVGProps } from "react";
import {
  AccountIcon,
  CustomersIcon,
  DashboardIcon,
  InvoicesIcon,
  OrderIcon,
  PricingIcon,
  ProductsIcon,
  QuotesIcon,
  ReportsIcon,
  SettingsIcon,
} from "./icons";

export type PortalRole = "ADMIN" | "SALES_REP";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/order", label: "Order Mode", icon: OrderIcon },
  { href: "/quotes", label: "Quotes", icon: QuotesIcon },
  { href: "/invoices", label: "Invoices", icon: InvoicesIcon },
  { href: "/customers", label: "Customers", icon: CustomersIcon },
  { href: "/products", label: "Products", icon: ProductsIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon, adminOnly: true },
  { href: "/pricing", label: "Pricing", icon: PricingIcon, adminOnly: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon, adminOnly: true },
  { href: "/account", label: "Account", icon: AccountIcon },
];

export function navItemsForRole(role: PortalRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || role === "ADMIN");
}

/** Active when the path is the item or a subroute of it. */
export function isNavItemActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
