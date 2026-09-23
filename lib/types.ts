export type PostStatus = "published" | "draft" | "scheduled";

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  city: string;
  author: string;
  image_url: string;
  image_credit?: string;
  featured: boolean;
  status: PostStatus;
  published_at: string | null;
  video_url?: string;
  source_name?: string;
  source_url?: string;
  source_author?: string;
  source_content?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  created_at: string;
  updated_at: string;
};

export type PostInput = Omit<Post, "id" | "created_at" | "updated_at">;

export type ImportedNews = {
  title: string;
  excerpt: string;
  content?: string;
  source_content?: string;
  category?: string;
  image_url: string;
  image_credit?: string;
  video_url?: string;
  source_name: string;
  source_url: string;
  source_author?: string;
  published_at?: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CategoryInput = Omit<Category, "id" | "created_at" | "updated_at">;

export type SocialLinks = {
  instagram?: string;
  whatsapp?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  twitter?: string;
};

export type SiteSettings = {
  site_name: string;
  tagline: string;
  socials: SocialLinks;
  updated_at?: string;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: "admin" | "editor";
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

