export interface Product {
  id: string;
  slug: string;

  // Trendyol'dan gelen ham veriler
  trendyol_id: string;
  trendyol_title: string;
  trendyol_description: string;
  trendyol_price: number;
  trendyol_stock: number;
  trendyol_images: string[];
  trendyol_category: string;
  trendyol_barcode: string;

  // Override alanları
  override_title: string | null;
  override_description: string | null;
  override_price: number | null;
  override_images: string[] | null;

  // Hesaplanan alanlar (view'dan)
  display_title: string;
  display_price: number;
  display_images: string[];

  // Site yönetimi
  collection_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  badge: 'new' | 'bestseller' | 'sale' | null;

  created_at: string;
  updated_at: string;
  last_synced_at: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface CartItem {
  product_id: string;
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string | null;
  guest_email: string | null;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: 'pending' | 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  iyzico_payment_id: string | null;
  shipping_address: Address;
  created_at: string;
}

export interface Address {
  full_name: string;
  phone: string;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  zip_code: string;
}
