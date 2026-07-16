"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { CatalogProduct, PurchaseHistoryEntry } from "@/lib/data/catalog";
import { fetchCustomerPurchaseHistory } from "@/lib/actions/order-actions";
import type { CartLine, QuoteLadderCode } from "@/components/quotes/wizard-types";
import {
  createOrderModeReducer,
  initialOrderModeState,
  type CatalogsByLadder,
  type OrderCustomer,
  type OrderModeState,
} from "./orderMode";

const STORAGE_KEY = "lap-sales-portal:order-mode";

interface StoredSnapshot {
  customerId: string | null;
  ladder: QuoteLadderCode;
  overridden: boolean;
  cart: CartLine[];
}

interface OrderModeContextValue {
  state: OrderModeState;
  /** Catalog for the currently active ladder. */
  catalog: CatalogProduct[];
  catalogs: CatalogsByLadder;
  customers: OrderCustomer[];
  /** Signed-in user id, used as the default rep on drawer-created customers. */
  currentUserId: string;
  /** The signed-in user's no-approval discount ceiling (admins get 100). Display only - the server re-checks. */
  discountLimitPercent: number;
  /** Company default quote lifetime, mirrored from the legacy wizard's payload. */
  defaultExpirationDays: number;
  /** Previously-purchased map for the selected customer, keyed by variantId. */
  purchaseHistory: Map<string, PurchaseHistoryEntry>;
  setCustomer: (customer: OrderCustomer | null) => void;
  setLadder: (ladder: QuoteLadderCode) => void;
  addLine: (variantId: string, quantity: number) => void;
  addSample: (variantId: string, quantity?: number) => void;
  setQty: (variantId: string, quantity: number, isSample?: boolean) => void;
  removeLine: (variantId: string, isSample?: boolean) => void;
  setLineNote: (variantId: string, note: string, isSample?: boolean) => void;
  setLineDiscount: (variantId: string, discountPercent: number | null) => void;
  clearCart: () => void;
  /** Registers a newly created customer (from the drawer inline form) and selects it. */
  adoptNewCustomer: (customer: OrderCustomer) => void;
}

const OrderModeContext = createContext<OrderModeContextValue | null>(null);

export function useOrderMode(): OrderModeContextValue {
  const ctx = useContext(OrderModeContext);
  if (!ctx) throw new Error("useOrderMode must be used inside <OrderModeProvider>");
  return ctx;
}

function isLadder(value: unknown): value is QuoteLadderCode {
  return value === "BULK_RETAIL" || value === "BULK_WHOLESALE";
}

export function OrderModeProvider({
  catalogs,
  customers: serverCustomers,
  currentUserId,
  discountLimitPercent,
  defaultExpirationDays,
  initialCustomerId,
  initialHistory,
  children,
}: {
  catalogs: CatalogsByLadder;
  customers: OrderCustomer[];
  currentUserId: string;
  discountLimitPercent: number;
  defaultExpirationDays: number;
  initialCustomerId?: string;
  initialHistory?: PurchaseHistoryEntry[];
  children: React.ReactNode;
}) {
  const reducer = useMemo(() => createOrderModeReducer(catalogs), [catalogs]);
  const [state, dispatch] = useReducer(reducer, initialOrderModeState);
  // Drawer-created customers live alongside the server list until the next navigation.
  const [customers, setCustomers] = useState<OrderCustomer[]>(serverCustomers);
  const [historyEntries, setHistoryEntries] = useState<PurchaseHistoryEntry[]>(initialHistory ?? []);
  const hydratedRef = useRef(false);

  // Restore after mount (sessionStorage is client-only; doing it during render would
  // mismatch the server HTML). A ?customerId= preselect beats the stored session.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const preselected = initialCustomerId
      ? serverCustomers.find((c) => c.id === initialCustomerId)
      : undefined;
    if (preselected) {
      dispatch({ type: "SET_CUSTOMER", customer: preselected });
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredSnapshot;
      if (!isLadder(stored.ladder) || !Array.isArray(stored.cart)) return;
      const customer = stored.customerId
        ? serverCustomers.find((c) => c.id === stored.customerId) ?? null
        : null;
      dispatch({
        type: "RESTORE",
        customer,
        ladder: stored.ladder,
        overridden: customer ? Boolean(stored.overridden) : false,
        cart: stored.cart,
      });
    } catch {
      // A corrupt snapshot is worthless; start clean rather than crash the selling screen.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist so a refresh mid-conversation never loses the cart.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const snapshot: StoredSnapshot = {
      customerId: state.customer?.id ?? null,
      ladder: state.ladder,
      overridden: state.overridden,
      cart: state.cart,
    };
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Storage full/blocked: the app still works, only refresh-persistence is lost.
    }
  }, [state]);

  // Load the selected customer's purchase history for the rail + card last-order lines.
  const customerId = state.customer?.id ?? null;
  useEffect(() => {
    if (!customerId) {
      setHistoryEntries([]);
      return;
    }
    let cancelled = false;
    fetchCustomerPurchaseHistory(customerId)
      .then((entries) => {
        if (!cancelled) setHistoryEntries(entries);
      })
      .catch(() => {
        if (!cancelled) setHistoryEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const setCustomer = useCallback((customer: OrderCustomer | null) => {
    dispatch({ type: "SET_CUSTOMER", customer });
  }, []);
  const setLadder = useCallback((ladder: QuoteLadderCode) => {
    dispatch({ type: "SET_LADDER", ladder });
  }, []);
  const addLine = useCallback((variantId: string, quantity: number) => {
    dispatch({ type: "ADD_LINE", variantId, quantity });
  }, []);
  const addSample = useCallback((variantId: string, quantity?: number) => {
    dispatch({ type: "ADD_SAMPLE", variantId, quantity });
  }, []);
  const setQty = useCallback((variantId: string, quantity: number, isSample?: boolean) => {
    dispatch({ type: "SET_QTY", variantId, quantity, isSample });
  }, []);
  const removeLine = useCallback((variantId: string, isSample?: boolean) => {
    dispatch({ type: "REMOVE_LINE", variantId, isSample });
  }, []);
  const setLineNote = useCallback((variantId: string, note: string, isSample?: boolean) => {
    dispatch({ type: "SET_LINE_NOTE", variantId, note, isSample });
  }, []);
  const setLineDiscount = useCallback((variantId: string, discountPercent: number | null) => {
    dispatch({ type: "SET_LINE_DISCOUNT", variantId, discountPercent });
  }, []);
  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);
  const adoptNewCustomer = useCallback((customer: OrderCustomer) => {
    setCustomers((prev) => (prev.some((c) => c.id === customer.id) ? prev : [customer, ...prev]));
    dispatch({ type: "SET_CUSTOMER", customer });
  }, []);

  const purchaseHistory = useMemo(
    () => new Map(historyEntries.map((e) => [e.variantId, e])),
    [historyEntries]
  );

  const value = useMemo<OrderModeContextValue>(
    () => ({
      state,
      catalog: catalogs[state.ladder],
      catalogs,
      customers,
      currentUserId,
      discountLimitPercent,
      defaultExpirationDays,
      purchaseHistory,
      setCustomer,
      setLadder,
      addLine,
      addSample,
      setQty,
      removeLine,
      setLineNote,
      setLineDiscount,
      clearCart,
      adoptNewCustomer,
    }),
    [state, catalogs, customers, currentUserId, discountLimitPercent, defaultExpirationDays, purchaseHistory, setCustomer, setLadder, addLine, addSample, setQty, removeLine, setLineNote, setLineDiscount, clearCart, adoptNewCustomer]
  );

  return <OrderModeContext.Provider value={value}>{children}</OrderModeContext.Provider>;
}
