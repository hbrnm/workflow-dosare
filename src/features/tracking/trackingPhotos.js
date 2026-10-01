/**
 * Fotografiile vizibile clientului, ca URL-uri semnate de edge function-ul `tracking-photos`.
 * Întoarce `null` când funcția nu e disponibilă (nedeployată / eroare), ca pagina să
 * poată folosi calea veche cu URL-uri publice; `[]` înseamnă „funcția a răspuns: nu sunt poze".
 */
export async function fetchTrackingPhotos(supabaseClient, token) {
  try {
    const { data, error } = await supabaseClient.functions.invoke("tracking-photos", { body: { token } });
    if (error || !Array.isArray(data?.photos)) return null;
    return data.photos.filter((p) => p && typeof p === "object" && p.url);
  } catch {
    return null;
  }
}
