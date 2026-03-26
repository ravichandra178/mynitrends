#!/bin/bash


# ====== CONFIG ======
APP_ID="1208364057636571"
APP_SECRET="12387df709e47544d764cf35093e5c59"
SHORT_LIVED_TOKEN="EAARLAC5qLtsBRAdZAWZANEemh5vyC8VNQQZCkjVNor49CjtOVWAhQq8DlznJewg4aLzcTSYhsNgpc33LgHNZAbPNGOYobmnJZCHoJwqpHP6zuMs9ZApN8ZAEyeMeaYbW5IajcDniooPlSuyZBZBnnogTd6ZBQhBun8vi3koGZA3JWAPzjNP3Igjv63NVOAXPHxpyRl3asQMkaP58JOZBgZARR5oIuFxfvsMWft9b7r1dvCwwHKI9h"


# ====== STEP 1: Exchange for Long-Lived User Token ======
echo "Getting long-lived user token..."


LONG_LIVED_RESPONSE=$(curl -s "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=$APP_ID&client_secret=$APP_SECRET&fb_exchange_token=$SHORT_LIVED_TOKEN")


LONG_LIVED_TOKEN=$(echo $LONG_LIVED_RESPONSE | jq -r '.access_token')


if [ "$LONG_LIVED_TOKEN" == "null" ]; then
 echo "❌ Failed to get long-lived token"
 echo "$LONG_LIVED_RESPONSE"
 exit 1
fi


echo "✅ Long-lived user token obtained"


# ====== STEP 2: Get Page Access Token ======
echo "Fetching page access tokens..."


PAGES_RESPONSE=$(curl -s "https://graph.facebook.com/v19.0/me/accounts?access_token=$LONG_LIVED_TOKEN")


echo "$PAGES_RESPONSE" | jq


PAGE_TOKEN=$(echo $PAGES_RESPONSE | jq -r '.data[0].access_token')


if [ "$PAGE_TOKEN" == "null" ]; then
 echo "❌ Failed to get page token"
 exit 1
fi


echo "✅ Page Access Token:"
echo "$PAGE_TOKEN"

# "category": "Educational research centre",
#       "category_list": [
#         {
#           "id": "191921914160604",
#           "name": "Educational research centre"
#         }
#       ],
#       "name": "Myni unofficial",
#       "id": "1070907976094986",
#       "tasks": [
#         "ADVERTISE",
#         "ANALYZE",
#         "CREATE_CONTENT",
#         "MESSAGING",
#         "MODERATE",
#         "MANAGE"
#       ]
#     }
#   ],
#   "paging": {
#     "cursors": {
#       "before": "QVFIU0lWNHF6SnJlSWloWU4zU210LTNSLThBZAndMVjQzNlZAvVm1ENGc2bkxyY2dJT3lKcldJeXVFNElBd1A0WmZAfdjZAVU0tYREs0UGZARS01lamItM29RT25B",
#       "after": "QVFIU0lWNHF6SnJlSWloWU4zU210LTNSLThBZAndMVjQzNlZAvVm1ENGc2bkxyY2dJT3lKcldJeXVFNElBd1A0WmZAfdjZAVU0tYREs0UGZARS01lamItM29RT25B"
#     }
#   }
# }

