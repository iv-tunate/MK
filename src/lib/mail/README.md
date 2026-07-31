# Email / mail provider

The app sends three transactional emails:

| When                                       | Template name      |
|--------------------------------------------|--------------------|
| Customer submits a checkout order          | `order-invoice`    |
| Admin marks an order as **completed**      | `order-receipt`    |
| Customer submits a custom quote request    | `quote-request`    |

The wording for all three lives in `src/lib/messages.ts` — edit there.

## Switching provider (no code changes)

Set env vars in `.env`:

```
# Send everything through Brevo.
VITE_MAIL_PROVIDER=brevo
VITE_BREVO_API_KEY=your-brevo-api-key
VITE_BREVO_FROM_EMAIL=hello@yourdomain.com
VITE_BREVO_FROM_NAME="MK Hub"
```

### Brevo notes

* Brevo allows sending transactional emails without needing a fully verified domain right away, making it great for quick setups.
* The API key (`VITE_BREVO_API_KEY`) is exposed to the browser in this setup. This is fine for initial testing, but for production, we recommend moving the email sending logic to a secure backend environment like a Supabase Edge Function to protect the key.

## Adding another provider

1. Implement `MailProvider` in `src/lib/mail/index.ts`.
2. Branch on `VITE_MAIL_PROVIDER` to pick it.
3. Done — `Checkout`, `Quote`, and the admin receipt flow all go through
   `sendMail()` so no other file needs to change.