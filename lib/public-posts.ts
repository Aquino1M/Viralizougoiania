"use client";

import type { Post } from "@/lib/types";

export const LOCAL_POSTS_KEY="viralizougoiania.browser-posts.v1";

export type PublicPost=Post & {
  display_image_url?:string;
  local_only?:boolean;
};

export function readPublishedLocalPosts():PublicPost[]{
  if(typeof window==="undefined")return [];
  try{
    const raw=window.localStorage.getItem(LOCAL_POSTS_KEY);
    const parsed=raw?JSON.parse(raw):[];
    if(!Array.isArray(parsed))return [];
    return parsed
      .filter((p:Post)=>p&&p.status==="published")
      .map((p:Post)=>({...p,display_image_url:p.image_url,local_only:true}));
  }catch{return [];}
}

export function mergePublishedPosts(remote:PublicPost[], local:PublicPost[]){
  const bySlug=new Map<string,PublicPost>();
  for(const post of remote)bySlug.set(post.slug,post);
  for(const post of local)bySlug.set(post.slug,post);
  return [...bySlug.values()]
    .filter(p=>p.status==="published")
    .sort((a,b)=>+new Date(b.published_at||b.created_at)-+new Date(a.published_at||a.created_at));
}

export function postImage(post:PublicPost){
  return post.display_image_url||post.image_url||"https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";
}
