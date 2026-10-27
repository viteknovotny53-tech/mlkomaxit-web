# M&L komaxit – web

Statický web (Eleventy) na Netlify, obsah si klient upravuje přes Pages CMS.

- **Web (návrh):** https://mlkomaxit-navrh.netlify.app
- **Netlify:** https://app.netlify.com/projects/mlkomaxit-navrh (tým „vitek project“)
- **Administrace:** https://app.pagescms.org/viteknovotny53-tech/mlkomaxit-web/main
- **Repozitář:** https://github.com/viteknovotny53-tech/mlkomaxit-web (soukromý)

Netlify i Pages CMS jsou propojené, každý push nebo uložení v CMS do `main` web
do minuty přestaví. Klient zatím do Pages CMS pozvaný není.

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

## Nasazení

Hotovo: repozitář je naimportovaný do Netlify, build command a publish složku Netlify
čte z `netlify.toml`. Detekce formulářů (Project configuration → Forms) je zapnutá,
u nových projektů je ve výchozím stavu vypnutá a formulář by bez ní nic neodeslal.

Zbývá před spuštěním:

1. **Notifikace formuláře** – Forms → Form submission notifications → Add notification →
   e-mail klienta (ml.komaxit@seznam.cz), ať mu poptávky chodí rovnou.
2. **Doména** – Domain management → přidat doménu klienta, DNS u registrátora nasměrovat na Netlify.

## Administrace pro klienta (Pages CMS)

Pages CMS GitHub App je nainstalovaná jen k tomuto repozitáři. Až bude návrh schválený:

1. Přihlas se na https://app.pagescms.org přes svůj GitHub účet.
2. Otevři repozitář v Pages CMS → Collaborators → pozvi e-mail klienta.
   Klient **nepotřebuje GitHub účet**, přihlašuje se odkazem z e-mailu.
3. Pošli klientovi `NAVOD-PRO-KLIENTA.md`.

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
