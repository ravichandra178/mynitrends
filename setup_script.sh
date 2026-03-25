#!/bin/bash

# ===== TEST DATA =====
PAGE_ID="1070907976094986"
PAGE_ACCESS_TOKEN="EAARLAC5qLtsBRFlEDnv6AcZA7sod8h8JoZBSFzAQPFiamWY6gAefR8EHlKChR6Uzaj8ZC77ACuf0nLFCMzVVO5lYyNZA7MFIslvwGqZBr5WXfP05ppFKomIEAedjuXnsUgMfUp9ZCwpK9sU51L7qA3zjqduNnAyP8DqGAaRrLlKMJGd0ZCFavYpeI5xrCzp66Goa0ndIHLumR6RKoeUjgES0VnvKJ0rebEldoFlZBNIZD"

IMAGE_URL="https://picsum.photos/id/237/200/300"
CAPTION="Test image post from Bash script 🚀"

# ===== FACEBOOK API CALL =====
curl -X POST "https://graph.facebook.com/v19.0/$PAGE_ID/photos" \
  -F "url=$IMAGE_URL" \
  -F "caption=$CAPTION" \
  -F "access_token=$PAGE_ACCESS_TOKEN"