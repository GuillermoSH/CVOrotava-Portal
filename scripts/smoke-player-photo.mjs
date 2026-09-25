/**
 * Smoke test: player-photos bucket + photo_path roundtrip (service role).
 * Usage: node --env-file=.env.local scripts/smoke-player-photo.mjs
 * Restores player row + deletes test object.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("FAIL: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function ok(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log("OK  ", name, detail);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error("FAIL", name, detail);
}

// Minimal 1x1 WebP
const webpBytes = Buffer.from(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=",
  "base64",
);

{
  const { data, error } = await admin.storage.getBucket("player-photos");
  if (error || !data) fail("bucket_exists", error?.message || "no data");
  else if (data.public) fail("bucket_private", "bucket is public");
  else
    ok(
      "bucket_exists_private",
      `limit=${data.file_size_limit} mime=${JSON.stringify(data.allowed_mime_types)}`,
    );
}

{
  const { data, error } = await admin
    .from("players")
    .select("id, photo_path, photo_taken, photo_consent")
    .limit(1);
  if (error) fail("photo_path_column", error.message);
  else
    ok(
      "photo_path_column",
      data?.[0]
        ? `sample=${data[0].id.slice(0, 8)}… path=${data[0].photo_path}`
        : "no players",
    );
}

{
  const { data: players, error } = await admin
    .from("players")
    .select("id, first_name, last_name, photo_path, photo_taken, photo_consent")
    .eq("is_active", true)
    .limit(20);

  if (error || !players?.length) {
    fail("pick_player", error?.message || "no players");
  } else {
    const player = players.find((p) => !p.photo_path) || players[0];
    const path = `${player.id}/avatar.webp`;
    const prevPath = player.photo_path;
    const prevTaken = player.photo_taken;
    const prevConsent = player.photo_consent;

    ok(
      "pick_player",
      `${player.last_name} ${player.first_name} (${player.id.slice(0, 8)}…)`,
    );

    const { data: signed, error: signErr } = await admin.storage
      .from("player-photos")
      .createSignedUploadUrl(path, { upsert: true });

    if (signErr || !signed) {
      fail("signed_upload_url", signErr?.message || "no signed");
    } else {
      ok("signed_upload_url", "token ok");
      const { error: upErr } = await admin.storage
        .from("player-photos")
        .uploadToSignedUrl(signed.path, signed.token, webpBytes, {
          contentType: "image/webp",
          upsert: true,
        });
      if (upErr) fail("upload_to_signed_url", upErr.message);
      else ok("upload_to_signed_url", `${webpBytes.length} bytes`);
    }

    {
      const { data: obj, error: dlErr } = await admin.storage
        .from("player-photos")
        .download(path);
      if (dlErr || !obj) fail("download_object", dlErr?.message || "empty");
      else {
        const size = (await obj.arrayBuffer()).byteLength;
        ok("download_object", `${size} bytes type=${obj.type || "n/a"}`);
      }
    }

    const patch = { photo_path: path };
    if (!player.photo_taken) patch.photo_taken = true;
    const { error: updErr } = await admin
      .from("players")
      .update(patch)
      .eq("id", player.id);
    if (updErr) fail("confirm_db_update", updErr.message);
    else
      ok(
        "confirm_db_update",
        `was taken=${prevTaken}; patch=${JSON.stringify(patch)}`,
      );

    {
      const { data: after, error: afterErr } = await admin
        .from("players")
        .select("photo_path, photo_taken, photo_consent")
        .eq("id", player.id)
        .single();
      if (afterErr) fail("verify_after_confirm", afterErr.message);
      else if (after.photo_consent !== prevConsent)
        fail("photo_consent_untouched", "changed!");
      else if (after.photo_path !== path)
        fail("photo_path_set", String(after.photo_path));
      else if (!prevTaken && after.photo_taken !== true)
        fail("photo_taken_set_when_false", String(after.photo_taken));
      else if (prevTaken && after.photo_taken !== true)
        fail("photo_taken_stayed_true", String(after.photo_taken));
      else
        ok(
          "verify_after_confirm",
          `consent=${after.photo_consent} taken=${after.photo_taken}`,
        );
    }

    {
      const { error: storageRmErr, data: removed } = await admin.storage
        .from("player-photos")
        .remove([path]);
      if (storageRmErr) fail("cleanup_storage_remove", storageRmErr.message);
      else ok("cleanup_storage_remove", `deleted=${removed?.length ?? 0}`);
    }

    {
      const { error: rmErr } = await admin
        .from("players")
        .update({ photo_path: prevPath, photo_taken: prevTaken })
        .eq("id", player.id);
      if (rmErr) fail("cleanup_restore", rmErr.message);
      else ok("cleanup_restore", "restored previous row state");
    }

    // Usar list (no download): tras delete, download puede servir caché CDN unos minutos.
    {
      const { data: remaining, error: listErr } = await admin.storage
        .from("player-photos")
        .list(player.id);
      if (listErr) fail("cleanup_storage", listErr.message);
      else if ((remaining ?? []).some((f) => f.name === "avatar.webp"))
        fail("cleanup_storage", "avatar.webp still listed");
      else ok("cleanup_storage", "folder empty / no avatar.webp");
    }
  }
}

const passed = results.filter((r) => r.ok).length;
console.log("---");
console.log(`SUMMARY ${passed}/${results.length} passed`);
if (results.some((r) => !r.ok)) process.exit(1);
