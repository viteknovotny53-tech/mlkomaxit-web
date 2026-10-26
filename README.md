# M&L komaxit – web

Statický web (Eleventy) na Netlify, obsah si klient upravuje přes Pages CMS.

```
src/_data/*.json    obsah webu – tohle edituje klient přes CMS
src/img/uploads/    fotky nahrané přes CMS (originály, zmenšují se při buildu)
src/img/            logo, favicon (needituje se)
src/index.njk       šablona stránky
src/css, src/js     styly a skripty
.pages.yml          konfigurace administrace Pages CMS
netlify.toml        nastavení buildu pro Netlify
```

## Lokálně

```bash
npm install
npm start          # http://localhost:5179, živý náhled
npm run build      # výstup do _site/
```

## Nasazení (jednorázově)

1. **GitHub** – vytvoř repozitář (klidně soukromý) a nahraj do něj obsah složky `web/`
   (ne celý projekt s podklady). `node_modules`, `_site` a `.cache` hlídá `.gitignore`.
2. **Netlify** – Add new site → Import from Git → vyber repozitář. Build command a publish
   složku si Netlify načte z `netlify.toml`, nic nevyplňuješ.
3. **Formulář** – Netlify najde formulář `poptavka` sám při prvním deployi.
   V Site configuration → Forms → Form notifications přidej e-mail klienta
   (ml.komaxit@seznam.cz), ať mu poptávky chodí rovnou.
4. **Doména** – Domain management → přidat doménu klienta, DNS u registrátora nasměrovat na Netlify.

## Administrace pro klienta (Pages CMS)

1. Přihlas se na https://app.pagescms.org přes svůj GitHub účet.
2. Nainstaluj Pages CMS GitHub App a povol jí přístup k repozitáři webu.
3. Otevři repozitář v Pages CMS → Collaborators → pozvi e-mail klienta.
   Klient **nepotřebuje GitHub účet**, přihlašuje se odkazem z e-mailu.
4. Pošli klientovi `NAVOD-PRO-KLIENTA.md`.

Klient smí upravovat obsah a fotky. Konfiguraci (`.pages.yml`) a správu přístupů měnit nemůže –
to zůstává tobě.

Každá uložená změna v CMS = commit do GitHubu → Netlify web přestaví (zhruba 1 minuta).

## Když přibude nové pole

Nový text na webu = přidat klíč do příslušného `src/_data/*.json`, použít ho v `src/index.njk`
a **přidat pole do `.pages.yml`**. Klíče, které v `.pages.yml` nejsou, klient nevidí a nemůže je upravit.

## Proč Pages CMS a ne Decap

- Klient se přihlásí e-mailem bez GitHub účtu a bez Netlify Identity. Netlify Identity
  bylo v roce 2025 označené za ukončované; v roce 2026 to podle komunity odvolali, ale
  na jeho budoucnost raději nespoléhám.
- Přehlednější a modernější rozhraní pro netechnického klienta.
- Obsah je v obyčejných JSON souborech, takže přechod na Decap CMS by znamenal jen
  nový konfigurační soubor (`admin/config.yml`), šablona zůstane.
