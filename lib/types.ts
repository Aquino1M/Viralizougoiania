export type PostStatus = "published" | "draft" | "scheduled";
export type ReviewStatus = "not_required" | "unreviewed" | "reviewed";

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
  source_title?: string;
  source_excerpt?: string;
  source_author?: string;
  source_published_at?: string | null;
  source_content?: string;
  source_word_count?: number;
  source_capture_method?: string;
  source_complete?: boolean;
  article_section?: string;
  image_credit?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  review_status?: ReviewStatus;
  rewrite_similarity?: number | null;
  created_at: string;
  updated_at: string;
};

export type PostInput = Omit<Post, "id" | "created_at" | "updated_at">;

export type ImportedNews = {
  title: string;
  excerpt: string;
  image_url: string;
  image_proxy_url?: string;
  image_caption?: string;
  source_name: string;
  source_url: string;
  source_author?: string;
  source_published_at?: string | null;
  article_section?: string;
  source_content?: string;
  source_word_count?: number;
  source_capture_method?: string;
  source_complete?: boolean;
  body_detected?: boolean;
  body_paragraphs?: number;
  published_at?: string | null;
};

export type RewriteResult = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  city: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  similarity: number;
  source_word_count: number;
  rewrite_word_count: number;
  completeness_ratio: number;
  warnings: string[];
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

export type UserRole = "admin" | "journalist";

export type StaffUser = {
  id: string;
  username: string;
  name: string;
  password_hash: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StaffUserPublic = Omit<StaffUser, "password_hash">;
