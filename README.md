# OrdinaFacile.food

## Avvio in locale

1. Installa le dipendenze: `npm install`
2. Crea un file `.env.local`
3. Avvia: `npm run dev`

## Variabili d'ambiente

L'app usa Supabase.

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Opzionale (se usi `Core.InvokeLLM`):

```
VITE_ANTHROPIC_API_KEY=...
```
