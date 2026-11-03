# Atlas vztahů

Společně tvořený web třídy k bloku *Vztahy a komunikace* (H-PMC).

- **Přehled třídy:** atlas typů vztahů na čtyřech osách a oddíly *Co od vztahů čekáme*, *Co do nich dáváme*, *Co je ničí*, *Na čem stojí* a *Rub a líc*. Všechno jde filtrovat podle typu vztahu a třídy.
- **Moje vztahy:** osobní mapa vztahů, pořadí hodnot, vlastní dvojice rub/líc a reflexe. Ukládá se jen v prohlížeči žáka a dá se stáhnout jako PDF.
- **Správa** (`admin.html`): schvalování příspěvků, úpravy, slučování duplicit, zapisování výsledků z hodiny, úprava typů vztahů a oddílů.

```
index.html       web pro žáky
admin.html       správa (heslo)
css/ js/
apps-script/
  Code.gs        backend pro Google tabulku (nahrává se do Apps Scriptu, ne na web)
```

## 1. Vyzkoušení bez serveru (demo)

Dokud je v `js/config.js` prázdné `API_URL`, web běží v **demo režimu**. Obsahuje smyšlená data a vše se ukládá jen v daném prohlížeči. Heslo do správy je `demo`.

Lokálně: v kořeni repozitáře spusť `python3 -m http.server` a otevři `http://localhost:8000`. Přímé otevření souboru `index.html` z disku nefunguje kvůli modulům JavaScriptu.

## 2. Backend: Google tabulka + Apps Script

1. Vytvoř novou Google tabulku (např. „Atlas vztahů – data“).
2. Otevři **Rozšíření → Apps Script**, smaž obsah a vlož celý `apps-script/Code.gs`. Ulož.
3. V horní liště vyber funkci **setup** a klikni na **Spustit**. Povol přístup ke své tabulce. Vzniknou listy `items`, `types` a `sections` s výchozími typy a oddíly.
4. **Nastavení projektu** (ozubené kolo) → **Vlastnosti skriptu** → **Přidat vlastnost**: `ADMIN_KEY` = heslo do správy.
5. **Nasadit → Nové nasazení → typ Webová aplikace**:
   - Spustit jako: **Já**
   - Kdo má přístup: **Kdokoli**

   Zkopíruj URL, která končí `/exec`.
6. Vlož ji do `js/config.js`:
   ```js
   export const API_URL = "https://script.google.com/macros/s/…/exec";
   ```

Když později upravíš `Code.gs`, použij **Nasadit → Spravovat nasazení → tužka → Verze: Nová verze**. URL zůstane stejná.

V tabulce můžeš data upravovat i ručně. Sloupce `types` a `classes` jsou seznamy oddělené čárkou (`rodina,pratelstvi`). `status` má hodnotu `approved`, `pending` nebo `hidden`.

## 3. Web na GitHub Pages

Repozitář už obsahuje web v kořeni. Stačí zapnout Pages: **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, Branch `main` / `(root)`. Za minutu bude web na `https://matejkus-edu.github.io/atlas-vztahu/` a správa na `…/atlas-vztahu/admin.html`.

Adresu Apps Scriptu doplníš přímo na GitHubu: otevři `js/config.js`, klikni na tužku, vlož URL do `API_URL` a dej *Commit changes*.

## Jak s tím pracovat v hodinách

- **Výsledky z tabule** zapiš ve správě na kartě *Přidat z hodiny*. Váha znamená, kolikrát věc zazněla: určuje velikost kruhu nebo výšku pilíře.
- **Žáci přispívají** tlačítkem *Přidat do přehledu* u každého oddílu nebo z osobní části (*Můj rub a líc → Odeslat anonymně*). Všechno nejdřív čeká na tvé schválení.
- **Duplicity** sloučíš na kartě *Všechny položky*: zaškrtni podobné položky a zvol *Sloučit vybrané*. Váhy se sečtou a zůstane text první vybrané položky.
- **Hlasy:** klepnutím na kruh nebo pilíř žák přidá hlas, jeden na zařízení.
- **Nový oddíl** pro další hodiny (např. *Co pomáhá v konfliktu*) přidáš na kartě *Oddíly*. Druh *bubliny* jsou kruhy, *pilíře* sloupy, *dvojice* rub a líc. Odškrtnutím *Žáci mohou přispívat* oddíl uzavřeš.
- **Typy vztahů** a jejich rozpětí na osách upravíš na kartě *Typy vztahů*: −1 je levý pól, +1 pravý.

## Soukromí

- Osobní část (mapa, priority, reflexe, jméno) se **nikam neodesílá**. Je jen v `localStorage` prohlížeče a v PDF, které si žák stáhne. Na sdíleném počítači ji smaže tlačítko *Smazat moje data*.
- Do tabulky se ukládá jen text příspěvku, typ vztahu a třída. Neukládá se jméno, e-mail ani IP adresa.

## Úpravy

- Názvy, třídy, hodnoty pro priority a symboly mapy najdeš v `js/config.js`.
- Výchozí typy a oddíly jsou v `js/seed.js` (demo) a na konci `Code.gs` (pro `setup`).
- Barvy, písmo a vzhled jsou v `css/style.css`.
