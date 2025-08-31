import { createClient } from "@supabase/supabase-js";

export default {
  async fetch(request, env) {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(request.url);

    // -------- GET /pets?since=... --------
    if (request.method === "GET" && url.pathname === "/pets") {
      const since = url.searchParams.get("since");
      let sinceDate;

      if (since) {
        sinceDate = new Date(parseInt(since, 10) * 1000).toISOString();
      } else {
        sinceDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // дефолт: за час
      }

      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .gt("created_at", sinceDate)
        .order("created_at", { ascending: true });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ pets: data || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // -------- POST / (сохраняем питомца) --------
    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!body.embeds || !Array.isArray(body.embeds) || body.embeds.length === 0) {
        return new Response(JSON.stringify({ error: "Invalid embeds" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const embed = body.embeds[0];
      const fields = embed.fields || [];

      let petName = null;
      let rarity = null;
      let owner = null;

      for (const f of fields) {
        if (f.name === "🪙 Name:") petName = f.value;
        if (f.name === "👥 Players:") owner = f.value;
      }

      // Попробуем достать rarity из description
      if (embed.description) {
        const match = embed.description.match(/Rarity:\s*([^\s]+)/i);
        if (match) rarity = match[1];
      }

      if (!petName) petName = "Unknown";
      if (!rarity) rarity = "Unknown";
      if (!owner) owner = "Unknown";

      const newPet = {
        pet_name: petName,
        rarity,
        owner,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("pets").insert([newPet]).select();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Pet saved", pet: data[0] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
