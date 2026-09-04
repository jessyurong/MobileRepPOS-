import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  useGetServices,
  useGetProducts,
  useCreateTransaction,
} from "@/lib/offline-api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Search,
  Wrench,
  Package,
  CreditCard,
  Banknote,
  CheckCircle2,
  X,
} from "lucide-react";

type CartItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  type: "service" | "product";
  stock?: number;
};

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    if (Array.isArray(obj.data)) {
      return obj.data as T[];
    }

    if (Array.isArray(obj.items)) {
      return obj.items as T[];
    }

    if (Array.isArray(obj.results)) {
      return obj.results as T[];
    }

    if (Array.isArray(obj.services)) {
      return obj.services as T[];
    }

    if (Array.isArray(obj.products)) {
      return obj.products as T[];
    }
  }

  return [];
}

export default function PosPage() {
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] =
    useState<"services" | "products">("services");

  const [checkoutOpen, setCheckoutOpen] =
    useState(false);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [notes, setNotes] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<"cash" | "gcash">("cash");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  /*
   * API DATA
   */
  const {
    data: rawServices,
    isLoading: servicesLoading,
  } = useGetServices();

  const {
    data: rawProducts,
    isLoading: productsLoading,
  } = useGetProducts();

  const createTransaction = useCreateTransaction();

  /*
   * SAFE ARRAY NORMALIZATION
   *
   * Prevents:
   * services.map is not a function
   * products.map is not a function
   */
  const services =
    normalizeArray<any>(rawServices);

  const products =
    normalizeArray<any>(rawProducts);

  /*
   * SEARCH FILTER
   */
  const filteredServices = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return services;

    return services.filter((service) =>
      String(service.name ?? "")
        .toLowerCase()
        .includes(term),
    );
  }, [services, search]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return products;

    return products.filter((product) =>
      String(product.name ?? "")
        .toLowerCase()
        .includes(term),
    );
  }, [products, search]);

  /*
   * CART
   */
  const addToCart = (
    item: any,
    type: "service" | "product",
  ) => {
    const itemId =
      item.id ?? item._id ?? item.name;

    const price = Number(
      item.price ??
      item.sellingPrice ??
      item.amount ??
      0,
    );

    setCart((currentCart) => {
      const existingIndex =
        currentCart.findIndex(
          (cartItem) =>
            cartItem.id === itemId &&
            cartItem.type === type,
        );

      if (existingIndex >= 0) {
        const updated = [...currentCart];

        if (
          type === "product" &&
          typeof item.stock === "number" &&
          updated[existingIndex].quantity >=
          item.stock
        ) {
          return currentCart;
        }

        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity:
            updated[existingIndex].quantity +
            1,
        };

        return updated;
      }

      return [
        ...currentCart,
        {
          id: itemId,
          name:
            item.name ??
            item.serviceName ??
            item.productName ??
            "Unnamed Item",
          price,
          quantity: 1,
          type,
          stock:
            type === "product"
              ? item.stock ??
              item.quantity ??
              undefined
              : undefined,
        },
      ];
    });
  };

  const updateQuantity = (
    id: string | number,
    type: "service" | "product",
    change: number,
  ) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (
            item.id !== id ||
            item.type !== type
          ) {
            return item;
          }

          const newQuantity =
            item.quantity + change;

          if (newQuantity < 1) {
            return null;
          }

          if (
            item.type === "product" &&
            item.stock !== undefined &&
            newQuantity > item.stock
          ) {
            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter(
          (
            item,
          ): item is CartItem => item !== null,
        ),
    );
  };

  const removeFromCart = (
    id: string | number,
    type: "service" | "product",
  ) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          !(
            item.id === id &&
            item.type === type
          ),
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
  };

  /*
   * TOTALS
   */
  const subtotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
      item.quantity,
    0,
  );

  const totalItems = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0,
  );

  /*
   * CHECKOUT
   */
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);

    try {
      const payload = {
        customerName:
          customerName.trim() || "Walk-in",
        customerPhone:
          customerPhone.trim() || undefined,
        notes:
          notes.trim() || undefined,
        paymentMethod,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          price: item.price,
          quantity: item.quantity,
        })),
        total: subtotal,
      };

      await createTransaction.mutateAsync(
        payload as any,
      );

      setCheckoutOpen(false);
      clearCart();

      setLocation("/");
    } catch (error) {
      console.error(
        "Failed to create transaction:",
        error,
      );

      alert(
        "Failed to complete the transaction. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading =
    activeTab === "services"
      ? servicesLoading
      : productsLoading;

  const displayItems =
    activeTab === "services"
      ? filteredServices
      : filteredProducts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* LEFT SIDE */}
        <div className="flex-1 space-y-4">
          {/* HEADER */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Point of Sale
              </h1>

              <p className="text-sm text-muted-foreground">
                Add services and products to the transaction
              </p>
            </div>
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={`Search ${activeTab}...`}
              className="pl-9"
            />
          </div>

          {/* TABS */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={
                activeTab === "services"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setActiveTab("services")
              }
              className="gap-2"
            >
              <Wrench className="h-4 w-4" />
              Services
            </Button>

            <Button
              type="button"
              variant={
                activeTab === "products"
                  ? "default"
                  : "outline"
              }
              onClick={() =>
                setActiveTab("products")
              }
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Products
            </Button>
          </div>

          {/* ITEMS */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading...
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No {activeTab} found
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {displayItems.map(
                (item: any) => {
                  const itemId =
                    item.id ??
                    item._id ??
                    item.name;

                  const name =
                    item.name ??
                    item.serviceName ??
                    item.productName ??
                    "Unnamed Item";

                  const price = Number(
                    item.price ??
                    item.sellingPrice ??
                    item.amount ??
                    0,
                  );

                  const stock =
                    item.stock ??
                    item.quantity;

                  const outOfStock =
                    activeTab === "products" &&
                    typeof stock === "number" &&
                    stock <= 0;

                  return (
                    <Card
                      key={itemId}
                      className={`cursor-pointer transition-all hover:border-primary ${outOfStock
                        ? "opacity-50"
                        : ""
                        }`}
                      onClick={() => {
                        if (!outOfStock) {
                          addToCart(
                            item,
                            activeTab ===
                              "services"
                              ? "service"
                              : "product",
                          );
                        }
                      }}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {name}
                        </CardTitle>
                      </CardHeader>

                      <CardContent>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-lg font-bold text-primary">
                              {formatCurrency(
                                price,
                              )}
                            </p>

                            {activeTab ===
                              "products" &&
                              stock !== undefined && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Stock: {stock}
                                </p>
                              )}
                          </div>

                          {outOfStock ? (
                            <Badge variant="destructive">
                              Out of Stock
                            </Badge>
                          ) : (
                            <Plus className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>
          )}
        </div>

        {/* CART */}
        <Card className="w-full lg:w-[400px] xl:w-[440px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Current Sale
              </CardTitle>

              {cart.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <div className="flex min-h-[260px] items-center justify-center text-center text-sm text-muted-foreground">
                Your cart is empty
              </div>
            ) : (
              <>
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.name}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {item.type === "service"
                              ? "Service"
                              : "Product"}{" "}
                            ·{" "}
                            {formatCurrency(
                              item.price,
                            )}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive"
                          onClick={() =>
                            removeFromCart(
                              item.id,
                              item.type,
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.type,
                                -1,
                              )
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.type,
                                1,
                              )
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="font-bold">
                          {formatCurrency(
                            item.price *
                            item.quantity,
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      Items ({totalItems})
                    </span>

                    <span>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xl font-bold">
                    <span>Total</span>

                    <span className="text-primary">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  onClick={() =>
                    setCheckoutOpen(true)
                  }
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Proceed to Checkout
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CHECKOUT DIALOG */}
      <Dialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Complete Transaction
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name
              </Label>

              <Input
                id="customerName"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value,
                  )
                }
                placeholder="Walk-in customer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">
                Phone Number
              </Label>

              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(event) =>
                  setCustomerPhone(
                    event.target.value,
                  )
                }
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label>
                Payment Method
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={
                    paymentMethod === "cash"
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setPaymentMethod("cash")
                  }
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  Cash
                </Button>

                <Button
                  type="button"
                  variant={
                    paymentMethod === "gcash"
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    setPaymentMethod("gcash")
                  }
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  GCash
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                Notes
              </Label>

              <Textarea
                id="notes"
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                placeholder="Optional notes..."
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>

              <span className="text-primary">
                {formatCurrency(subtotal)}
              </span>
            </div>

            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
              onClick={handleCheckout}
            >
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Complete Sale
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}