// ============================================================
// integrations.js — sostituisce Core
// ============================================================
import { supabase } from './supabaseClient';

export const Core = {

  // Upload file su Supabase Storage
  async UploadFile({ file, bucket = 'uploads' }) {
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const doUpload = async (b) => {
      const { data, error } = await supabase.storage
        .from(b)
        .upload(filename, file, { upsert: true });
      if (error) throw error;
      return data;
    };

    let resolvedBucket = bucket;
    try {
      await doUpload(resolvedBucket);
    } catch (error) {
      const msg = String(error?.message ?? error?.details ?? error ?? '');
      const isBucketNotFound = msg.toLowerCase().includes('bucket not found');
      if (!isBucketNotFound) throw error;

      try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) throw listError;
        const all = Array.isArray(buckets) ? buckets : [];
        const candidate =
          all.find((b) => b?.name === resolvedBucket) ||
          all.find((b) => b?.name === 'uploads') ||
          all.find((b) => b?.public) ||
          all[0];

        if (!candidate?.name) {
          throw new Error('Nessun bucket disponibile');
        }

        resolvedBucket = candidate.name;
        await doUpload(resolvedBucket);
      } catch (e) {
        const emsg = String(e?.message ?? e?.details ?? e ?? '');
        throw new Error(
          `Bucket Supabase Storage non trovato (${bucket}). Crea un bucket (es. "uploads") oppure configura il bucket corretto. Dettagli: ${emsg}`
        );
      }
    }

    const { data: publicData } = supabase.storage.from(resolvedBucket).getPublicUrl(filename);
    const publicUrl = publicData?.publicUrl;

    if (publicUrl) {
      return { file_url: publicUrl };
    }

    try {
      const { data: signed, error: signedError } = await supabase.storage
        .from(resolvedBucket)
        .createSignedUrl(filename, 60 * 60 * 24 * 30);
      if (signedError) throw signedError;
      if (!signed?.signedUrl) {
        throw new Error('Signed URL non disponibile');
      }
      return { file_url: signed.signedUrl };
    } catch (e) {
      const emsg = String(e?.message ?? e?.details ?? e ?? '');
      throw new Error(`Upload completato ma impossibile ottenere URL immagine. Dettagli: ${emsg}`);
    }
  },

  // Chiama Claude via API Anthropic
  async InvokeLLM({ prompt, response_json_schema, max_tokens = 500 }) {
    try {
      const { data, error } = await supabase.functions.invoke('invoke-llm', {
        body: {
          prompt,
          response_json_schema,
          max_tokens,
        },
      });

      if (error) {
        const msg = error?.message ?? 'errore sconosciuto';
        return `Errore IA: ${msg}`;
      }

      if (data?.error) {
        return String(data.error);
      }

      return data?.result ?? '';
    } catch (error) {
      console.error('InvokeLLM error:', error);
      return `Errore IA: ${error?.message ?? 'errore sconosciuto'}`;
    }
  },

  // Invia email tramite Supabase Edge Function (da configurare)
  async SendEmail({ to, subject, body, html_body }) {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, body, html_body },
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      // Non bloccare il flusso se l'email fallisce
      console.warn('SendEmail non configurato:', error.message);
      return { success: false };
    }
  },
};
