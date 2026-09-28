---
title: Pomoc – ZAYMAX
---

# Pomoc ZAYMAX

**Pomoc dotycząca wersji treningowej bez karty Zdrowie lub Kroki**

[Polityka prywatności](privacy-pl.html) · [Strona internetowa](https://zaymax.net) · [Deutsch](support.html) · [English](support-en.html)

ZAYMAX to lokalna aplikacja do planowania, wykonywania i zapisywania treningów. Nie wymaga konta.

## Kontakt

Pomoc i możliwości kontaktu znajdziesz na [zaymax.net](https://zaymax.net). Pytania, problemy i opinie możesz również przesłać e-mailem:

**Blazej Doszczeczko**
[blazej.doszczeczko@gmail.com](mailto:blazej.doszczeczko@gmail.com)

W zgłoszeniu technicznym podaj wersję i build ZAYMAX, model iPhone’a, wersję iOS, język aplikacji oraz ostatnie kroki przed wystąpieniem problemu. Nie wysyłaj e-mailem wrażliwych danych zdrowotnych ani pełnych plików kopii zapasowej.

Wersja treningowa nie zawiera okna zgłaszania problemów w aplikacji i nie wysyła automatycznych raportów o błędach. Samodzielnie wybierasz informacje, które chcesz przekazać.

## Wersja treningowa i starsze wersje z dostępem do Zdrowia

Zmieniona wersja treningowa skupia się na kartach **Dzisiaj** i **Dziennik**. Nie zawiera karty Zdrowie ani Kroki, nie prosi o uprawnienia do Zdrowia i nie odczytuje ani nie zapisuje danych w Apple Health. Ręcznie wprowadzone dane profilu i lokalne obliczanie BMI pozostają dostępne niezależnie od tej zmiany.

Zmiana jest dostarczana w aktualizacji aplikacji. Wcześniej zainstalowane starsze wersje z App Store lub TestFlight mogą nadal zawierać dotychczasowe funkcje Zdrowia lub Kroków. Ta instrukcja nie oznacza, że Twoja zainstalowana wersja już otrzymała tę zmianę.

Wcześniejsze uprawnienia ZAYMAX możesz sprawdzić i cofnąć w aplikacji Zdrowie lub ustawieniach prywatności iOS. Usunięcie integracji nie usuwa danych z Apple Health.

## Minutnik przerwy, dźwięki i haptyka

W **Ustawienia → Trening → Minutnik przerwy** możesz włączyć lub wyłączyć minutnik i wybrać długość przerwy. W **Dźwięki i haptyka** dostosujesz **Dźwięki aplikacji**, **Motyw dźwiękowy** i **Wibracje haptyczne**; haptykę można włączać niezależnie od dźwięków. W części **Zaawansowane** włączysz lub wyłączysz poszczególne zdarzenia dźwiękowe.

Aby słyszeć koniec przerwy przy zablokowanym iPhonie, włącz **Także przy zablokowanym ekranie** i zezwól na powiadomienia. Jeżeli dźwięku nie słychać, sprawdź również dźwięki aplikacji, zdarzenie **Koniec przerwy**, głośność, tryb cichy, tryb skupienia i **Ustawienia iOS → Powiadomienia → ZAYMAX**. Przypomnienia o końcu przerwy są planowane lokalnie na iPhonie.

## Widżet notatki na ekranie blokady

Wybierz notatkę w karcie **Dziennik** i opcję **Pokaż w widżecie ekranu blokady**. Następnie przytrzymaj ekran blokady iPhone’a, wybierz **Dostosuj**, otwórz obszar widżetów i dodaj widżet notatki ZAYMAX. Jeśli go nie ma, otwórz aplikację raz i uruchom ponownie iPhone’a. Cofnij wybór notatki dla ekranu blokady w ZAYMAX, gdy nie chcesz już jej wyświetlać w widżecie. Nie umieszczaj poufnego tekstu, ponieważ widżet może być widoczny na ekranie blokady.

## Kopia przed ponowną instalacją

Wybierz **Ustawienia → Zapisz kopię zapasową** i zapisz plik JSON poza ZAYMAX przez arkusz udostępniania iOS. Sprawdź plik przed usunięciem lub ponowną instalacją aplikacji. Aby go przywrócić, wybierz **Ustawienia → Wczytaj kopię zapasową**, wskaż plik JSON ZAYMAX i potwierdź zastąpienie bieżących danych lokalnych. Kopia nie jest szyfrowana i może zawierać osobiste dane treningowe, wpisy dziennika, dane profilu i ustawienia. Bez kopii deweloper nie może odzyskać lokalnie usuniętych danych.

**Usuwanie plików w aktualizacji, która nie została jeszcze opublikowana:** Wewnętrzny plik eksportu jest tworzony tymczasowo w pamięci podręcznej aplikacji, a jeśli jest ona niedostępna — w wewnętrznym obszarze dokumentów. Dokładnie ten plik jest usuwany po zakończeniu udostępniania, także po anulowaniu lub błędzie. Jeśli usunięcie pliku się nie powiedzie, aplikacja nie zgłasza powodzenia eksportu. Kopie, które samodzielnie zapiszesz lub udostępnisz poza aplikacją, pozostają dostępne.

Po wybraniu **Wczytaj kopię zapasową** mechanizm wyboru pliku tworzy tymczasową kopię w wewnętrznym podfolderze `DocumentPicker` pamięci podręcznej aplikacji. W tej samej nieopublikowanej jeszcze aktualizacji dokładnie ta kopia jest usuwana bezpośrednio po odczytaniu i sprawdzeniu zawartości, także gdy wystąpi błąd. Jeśli usunięcie tej kopii się nie powiedzie, wczytanie nie jest uznawane za pomyślne. Oryginalny wybrany plik kopii zapasowej pozostaje bez zmian.

## Usuwanie danych lokalnych

Poszczególne elementy możesz usuwać w aplikacji. **Ustawienia → Usuń wszystkie dane lokalne** usuwa zarządzane przez ZAYMAX dane treningowe, dane profilu, wpisy dziennika i ustawienia oraz wybraną notatkę widżetu.

W aktualizacji, która nie została jeszcze opublikowana, ta funkcja usuwa również wewnętrzne pliki kopii zapasowych, których nazwy dokładnie odpowiadają schematowi nazw kopii ZAYMAX, w tym starsze eksporty. Usuwa także starsze kopie importu lub kopie pozostałe po awarii, znajdujące się bezpośrednio w podfolderze `DocumentPicker` pamięci podręcznej, o nazwach dokładnie zgodnych ze schematem UUID mechanizmu wyboru pliku. Nie obejmuje dalszych podfolderów ani całej pamięci podręcznej. Jeśli usuwanie tych plików się nie powiedzie, nie pojawi się potwierdzenie pomyślnego usunięcia; wewnętrzne pliki kopii mogą nadal pozostać.

**W starszych wersjach bez tej funkcji usuwania** wewnętrzne kopie eksportu i importu mogą pozostać po udostępnieniu, wczytaniu lub użyciu **Usuń wszystkie dane lokalne**, także po anulowaniu operacji lub jej niepowodzeniu. Usuwanie tych plików wymaga odpowiedniej aktualizacji aplikacji. Usunięcie aplikacji usuwa jej lokalny obszar plików.

Wewnętrzne usuwanie nie obejmuje kopii zapasowych, które samodzielnie zapiszesz lub udostępnisz poza aplikacją, ani udostępnionych obrazów treningu. Tymi plikami oraz kopiami zapasowymi urządzenia lub kopiami w chmurze trzeba zarządzać i usuwać je osobno w miejscu przechowywania lub u odpowiedniego dostawcy.

## Pierwsze kroki przy problemach

- Całkowicie zamknij i ponownie otwórz ZAYMAX.
- Sprawdź aktualizację w App Store.
- Uruchom ponownie iPhone’a.
- Przy problemach z przypomnieniami o przerwie sprawdź uprawnienia do powiadomień oraz ustawienia dźwięku i urządzenia.
- W starszych instalacjach w razie potrzeby cofnij wcześniejsze uprawnienia do Zdrowia w iOS.
