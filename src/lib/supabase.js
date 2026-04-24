import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check for missing environment variables
const isConfigured = supabaseUrl && 
                   supabaseKey && 
                   !supabaseUrl.includes("your-project-id") && 
                   !supabaseUrl.includes("placeholder-url");

if (!isConfigured) {
  if (typeof window !== "undefined") {
    console.error(
      "Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
    );
  }
}

// Initialize the client only if configured, otherwise return a recursive proxy that logs errors
const createPlaceholderProxy = (path = "supabase") => {
  return new Proxy(() => {}, {
    get: (target, prop) => {
      if (prop === "then") return undefined; // Avoid issues with async/await
      return createPlaceholderProxy(`${path}.${String(prop)}`);
    },
    apply: (target, thisArg, args) => {
      const msg = `Supabase client (${path}) called without valid configuration. Check your .env.local file.`;
      console.error(msg);
      return Promise.resolve({ data: null, error: { message: msg } });
    }
  });
};

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey)
  : createPlaceholderProxy();
