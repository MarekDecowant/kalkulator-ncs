# Color Matt — kandydat do przeglądu, bez wdrożenia

Status: **propozycja przypisania do grup; nie zatwierdzono reguły cenowej**.

Dotychczasowy kalkulator rozpoznawał sam zapis NCS, a grupę wyznaczał z pierwszych czterech cyfr. W efekcie przyjmował nieobsługiwane kolory, np. 1305-B34G, i przypisywał wszystkie numery małego wzornika do grupy 1.

Zmiana zastępuje te przybliżenia zamkniętą listą receptur `Fox CM` z dostarczonego `data.kk`. Pozostałe produkty Atlasa są poza zakresem. Nie zmienia żadnej z 18 cen, adresów produktów ani istniejącego parametru `ncs` w linkach.

## Dane i zachowanie

- 2050 receptur NCS, odpowiadających 2048 różnym kodom, oraz 224 numery małego wzornika.
- Nieznany kod nie dostaje ceny ani linku zakupowego. Edycja pola natychmiast usuwa poprzedni wynik i linki.
- Cztery cyfry bez barwy nie są automatycznie uzupełniane o `-Y`.
- Podpowiedzi i historia zawierają wyłącznie kody z bazy Color Matt. Obsługiwane są pełne zapisy ze spacjami, bez myślnika i z prefiksem NCS; numery wzornika są zapisywane jako trzy cyfry.
- Brak wykluczeń ze względu na pojemność. Właściciel DECOWANT potwierdził 21.09.2026, że mieszalnik dozuje również kolory oznaczone w 175 recepturach Atlasa ostrzeżeniem dotyczącym 2,5 l. Te ostrzeżenia nie blokują ceny ani zakupu i nie są wyświetlane klientom.
- 196 receptur wymaga barwionego podkładu — komunikat pochodzi z pola `substrate`.
- Kody `S 3040-B` i `S 3040-B10G` mają po dwie różne receptury na różnych bazach. Do czasu wyboru receptury wymagają kontaktu ze sklepem.
- Podgląd pochodzi z pola RGB danych producenta; dla brakujących wartości nie powstaje wymyślony kolor. Nie jest to gwarancja zgodności ekranowej z fizyczną próbką.
- Surowe receptury, dawki, ceny pigmentów i ceny baz nie są dodawane do publicznego repozytorium.

## Proponowana reguła grupowania — do decyzji

Atlas nie zapisuje grup Decowant 1–6. W tej wersji przygotowano porównanie wyceny referencyjnej 5 l, obliczonej z bazy, rzeczywistych dawek pigmentów, stawek oraz ustawienia narzutu, z dotychczasowymi cenami 5 l. Wybierana jest najbliższa grupa; przy identycznej odległości wyższa. Wycena ponad najwyższą grupę wymaga indywidualnej kalkulacji. Ta sama grupa wybiera istniejące ceny i karty 2,5/5/10 l.

**To propozycja Decowant, nie reguła ani podział producenta.** Przed wdrożeniem należy:

1. Porównać wycenę referencyjną z wynikiem oryginalnego programu Atlasa dla 5 l. Odczytano pliki danych, lecz nie uruchomiono Windows EXE. Interpretacja jednostki stawki i narzutu wymaga tego sprawdzenia.
2. Zatwierdzić regułę najbliższej grupy lub podać własne progi. Najbliższa grupa może mieć cenę poniżej wyceny referencyjnej; ta reguła sama w sobie nie gwarantuje marży.
3. Rozstrzygnąć dwa kody z alternatywnymi bazami. Dla 10 l bazy szarej i transparentnej wpisana cena bazy wynosi zero; nie została potraktowana jako darmowa baza. Grupy opierają się wyłącznie na danych 5 l.

Po tych decyzjach należy wygenerować ostateczne mapowanie i usunąć oznaczenia wersji testowej. Nie należy scalać tego kandydata na produkcję bez kalibracji.

## Doradcze wyliczenie ilości farby

Opcjonalna sekcja „Ile farby zamówić?” przyjmuje powierzchnię ścian lub sufitu w m² oraz wybór 1 albo 2 warstw (domyślnie 2). Obsługuje przecinek i kropkę dziesiętną. Wynik aktualizuje się podczas wpisywania i jest niezależny od kodu koloru. Puste lub błędne pole metrażu nie blokuje wyceny ani linków zakupowych.

Obliczenie: `powierzchnia × liczba warstw / 14`. [Karta techniczna Color Matt, sekcja „Wydajność”](https://www.atlas.com.pl/wp-content/uploads/2026/08/d05b47c49c0641704dbca1fcc666b978b4b2d3c6_pl_7904_20211103_085814.pdf), udostępniona na [stronie Atlasa](https://www.atlas.com.pl/produkt/color-matt/), podaje do 14 m²/l przy jednej warstwie na gładkiej powierzchni. Źródło sprawdzone 21.09.2026. Interfejs wyjaśnia, że wynik jest orientacyjny, zużycie zależy od podłoża i aplikacji, a osobny podkład i dodatkowy zapas na poprawki nie są uwzględnione.

Propozycja opakowań zaokrągla ilość w górę do pełnych 2,5 l, a następnie dobiera możliwie małą liczbę wiader 10 / 5 / 2,5 l. Nie oblicza nowej ceny, nie wybiera grupy ani nie dodaje nic do koszyka. Przykładowo 35 m² przy jednej warstwie daje 2,5 l, przy dwóch 5 l; 42,5 m² przy dwóch warstwach daje około 6,08 l i propozycję 5 l + 2,5 l.

## Walidacja

`node tests/color-matt.test.cjs` — test wszystkich 2272 kodów i trzech pojemności, cen grup, blokad, linków, nieobsługiwanych kodów, podpowiedzi, historii oraz adresów `?ncs=`. Dodatkowo: ilość farby dla 1/2 warstw, przecinek/kropka, granice opakowań i zaokrąglenia, zdarzenia formularza, puste/błędne dane oraz niezależność porady od wyceny.

Osobno lokalnie porównano wszystkie 2274 receptury z wyliczeniem referencyjnym i sprawdzono, że blok `PRICES` jest identyczny z wersją wyjściową. Test w Chromium nie został wykonany: środowisko nie zawiera binarnego pliku przeglądarki. Układ bazuje na dotychczasowym HTML/CSS.

## Pochodzenie

- Bazowy plik index.html: blob `588ece42f55c141f48ccc584abaa879f0b30dce1`.
- `data.kk`: SHA-256 `145b854efb2beae54a78bf98b184b5cd644eabbe188971034484596be0b1a1d2`.
- `data_ceny.kk`: SHA-256 `43a6bdb608dccc7eebe6411d4858e6fc56d44fa2086019d6ba5b0359e823ce4d`.
- Wewnętrzna wersja danych: `Version:4.01`, data `2025-03-13`. To data wpisana w pliku, nie potwierdzenie bieżącej aktualności cennika producenta.
