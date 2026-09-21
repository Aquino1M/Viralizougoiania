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
  featured: boolean;
  status: PostStatus;
  published_at: string | null;
  source_name?: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
};

export type PostInput = Omit<Post, "id" | "created_at" | "updated_at">;

export type ImportedNews = {
  title: string;
  excerpt: string;
  image_url: string;
  source_name: string;
  source_url: string;
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
