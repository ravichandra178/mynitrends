import { supabase } from "@/integrations/supabase/client";

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*").limit(1).single();
  if (error) throw new Error("Failed to fetch settings");
  return data;
}

export async function updateSettings(updates: Record<string, unknown>) {
  const { data: existing } = await supabase.from("settings").select("id").limit(1).single();
  if (!existing) throw new Error("No settings found");
  const { error } = await supabase.from("settings").update(updates).eq("id", existing.id);
  if (error) throw new Error("Failed to update settings");
}

export async function fetchTrends() {
  console.log("[TRENDS LOG] 📊 Fetching trends from Supabase REST API...");
  const { data, error } = await supabase.from("trends").select("*").order("created_at", { ascending: false });
  
  if (error) {
    console.error("[TRENDS LOG] ❌ Failed to fetch trends:", error);
    throw new Error("Failed to fetch trends");
  }
  
  console.log(`[TRENDS LOG] ✅ Fetched ${data?.length || 0} trends from database:`);
  data?.forEach((trend: any, index: number) => {
    console.log(`[TRENDS LOG]   [${index + 1}] "${trend.topic}" | source: ${trend.source} | used: ${trend.used} | id: ${trend.id}`);
  });
  console.log("[TRENDS LOG] 📋 Full response:", data);
  
  return data || [];
}

export async function addTrend(topic: string) {
  const { error } = await supabase.from("trends").insert({ topic, source: "manual" });
  if (error) throw new Error("Failed to add trend");
}

export async function fetchPosts() {
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Failed to fetch posts");
  return data || [];
}

export async function deletePost(id: string) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error("Failed to delete post");
}

export async function updatePostContent(id: string, content: string) {
  const { error } = await supabase.from("posts").update({ content }).eq("id", id);
  if (error) throw new Error("Failed to update post");
}

export async function updatePostSchedule(id: string, scheduled_time: string) {
  const { error } = await supabase.from("posts").update({ scheduled_time }).eq("id", id);
  if (error) throw new Error("Failed to update schedule");
}
