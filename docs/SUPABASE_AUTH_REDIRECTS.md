# Supabase Auth — redirect URL checklist

Configure these in **Supabase Dashboard → Authentication → URL Configuration** for the **Meeting** project (`ytbilvvrqokjqvzbbtpd`).

## Site URL

```
https://meet.regalmesh.com
```

## Redirect URLs (add each line)

```
http://localhost:8080/**
http://localhost:8080/auth
http://localhost:8080/auth?redirect=**
https://meet.regalmesh.com/**
https://meet.regalmesh.com/auth
https://meet.regalmesh.com/auth?redirect=**
https://meet.regalmesh.com/auth?provider=regal-mail
https://regal-meeting.pages.dev/**
https://regal-meeting.pages.dev/auth
```

Email confirmation and password reset flows use `/auth?redirect=…` so users return to the meeting they were joining.

## Regal Mail SSO (separate project `xexnwcmqnelgzuqhkvtx`)

In **Regal Mail** Supabase → Auth → Redirect URLs:

```
http://localhost:8080/auth?provider=regal-mail
https://meet.regalmesh.com/auth?provider=regal-mail
```

## Verify

1. Open `https://meet.regalmesh.com/join/TESTCODE` while signed out → should redirect to `/auth?redirect=…`
2. Sign up with email → confirmation link should land on `/auth?redirect=…`, then the meeting
3. Regal Mail sign-in should return to `/auth?provider=regal-mail` and complete SSO
