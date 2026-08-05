# Edge Function: invite-user

Creează cont Auth (service role) + actualizează lista echipei din `setari`.

## Cerințe
- Caller JWT valid (`verify_jwt = true`)
- `is_admin()` = true pentru caller
- Body: `{ "email": "...", "password": "...", "role": "operator"|"admin" }`

## Client
```js
await supabase.functions.invoke("invite-user", {
  body: { email, password, role },
});
```

## Deploy
Deja deployat pe proiectul `workflow dosare`. Redeploy din repo:

```bash
supabase functions deploy invite-user --project-ref cfkyminejjnrwxrdlndt
```
