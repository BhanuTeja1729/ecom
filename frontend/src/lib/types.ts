export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      categories: {
        Row: Category;
        Insert: Partial<Category>;
        Update: Partial<Category>;
      };
      products: {
        Row: Product;
        Insert: Partial<Product>;
        Update: Partial<Product>;
      };
      product_images: {
        Row: ProductImage;
        Insert: Partial<ProductImage>;
        Update: Partial<ProductImage>;
      };
      product_variants: {
        Row: ProductVariant;
        Insert: Partial<ProductVariant>;
        Update: Partial<ProductVariant>;
      };
      reviews: {
        Row: Review;
        Insert: Partial<Review>;
        Update: Partial<Review>;
      };
      wishlist_items: {
        Row: WishlistItem;
        Insert: Partial<WishlistItem>;
        Update: Partial<WishlistItem>;
      };
      cart_items: {
        Row: CartItem;
        Insert: Partial<CartItem>;
        Update: Partial<CartItem>;
      };
      orders: {
        Row: Order;
        Insert: Partial<Order>;
        Update: Partial<Order>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Partial<OrderItem>;
        Update: Partial<OrderItem>;
      };
      coupons: {
        Row: Coupon;
        Insert: Partial<Coupon>;
        Update: Partial<Coupon>;
      };
      newsletter_subscribers: {
        Row: NewsletterSubscriber;
        Insert: Partial<NewsletterSubscriber>;
        Update: Partial<NewsletterSubscriber>;
      };
    };
  };
};

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  role: 'customer' | 'admin';
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  compare_price: number | null;
  cost_price: number | null;
  sku: string;
  inventory: number;
  low_stock_threshold: number;
  category_id: string | null;
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  is_digital: boolean;
  weight: number | null;
  dimensions: Record<string, number>;
  meta_title: string;
  meta_description: string;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_images?: ProductImage[];
  product_variants?: ProductVariant[];
  categories?: Category;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  type: string;
  value: string;
  price_modifier: number;
  inventory: number;
  sku: string;
  sort_order: number;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  body: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
  profiles?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: Product;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  products?: Product;
  product_variants?: ProductVariant;
}

export interface CartItemLocal {
  id: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total: number;
  coupon_code: string;
  shipping_address: ShippingAddress;
  billing_address: ShippingAddress;
  payment_method: string;
  payment_intent_id: string;
  notes: string;
  tracking_number: string;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string;
  price: number;
  quantity: number;
  total: number;
  created_at: string;
  products?: Product;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_order_amount: number;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  is_active: boolean;
  subscribed_at: string;
}

export interface ShippingAddress {
  full_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
