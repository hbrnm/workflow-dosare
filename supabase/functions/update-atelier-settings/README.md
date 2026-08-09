# Edge Function: update-atelier-settings

Salvează branding / setări pe `ateliere` cu service role și self-heal rol admin
(singurul membru sau listat în `setari.admin_emails` / `utilizatori`).

## Deploy

```bash
npx supabase functions deploy update-atelier-settings --project-ref cfkyminejjnrwxrdlndt
```

## Body

```json
{
  "atelierId": "uuid",
  "patch": { "nume": "Service Rapid", "short": "SR", "logo_url": null }
}
```

## Răspuns

`{ ok: true, atelier: { id, slug, nume, short, ... } }`
