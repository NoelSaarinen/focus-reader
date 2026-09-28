# Käsin vieritettävä lukutila

## Toteutus
- Lisätään lukutavaksi valinta **Automaattinen** / **Vieritä itse** nykyisten korostus- ja fokustilojen rinnalle.
- Automaattisessa tilassa nykyinen ajastettu eteneminen ja WPM-säädin toimivat ennallaan.
- Vieritä itse -tilassa tekstiä vieritetään normaalisti ja näkymän keskikohtaa lähin lause korostetaan automaattisesti.
- Vieritystila pysäyttää automaattisen etenemisen ja piilottaa siihen kuulumattomat nopeus- ja toistopainikkeet.
- Säilytetään mobiili- ja työpöytänäkymien nykyinen ulkoasu sekä vaalea/tumma teema.

## Tarkistus
- Testataan tilan vaihto, lausekorostuksen päivittyminen vieritettäessä ja paluu automaattiseen lukemiseen sekä puhelin- että työpöytäleveydellä.

## Tekniset tiedot
- Korostus päätellään lukupaneelin vierityssijainnista ilman tekstin tai lukutilan tallentamista.
