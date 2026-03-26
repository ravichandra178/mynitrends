#!/bin/bash


# ====== CONFIG ======
APP_ID="1208364057636571"
APP_SECRET="12387df709e47544d764cf35093e5c59"
SHORT_TOKEN="EAARLAC5qLtsBRPUFBdEZBeKUHrZAAMKgoCquhZAXdtaWmq7EFgPmC14cxCOddZC0wM2noei4lOHPKLwFyI7pjESO1dPZCcj3D3z3FwNFsTTHTz1VsRFgJ1wD1rsUSSRGpAd7b1HfUzx512ETQyhZA59K7YI2WdILEs3rCfOWobaf1E929ZC8G5hdFZATAiZCJeBFWxZCsO3l8KsRba0Gi7ZCLr3SiEO14pi1gh6JWZCZBMIYZD"


# ========= STEP 1: Exchange for Long-Lived User Token =========
echo "🔄 Exchanging for long-lived user token..."

LONG_RES=$(curl -s -G "https://graph.facebook.com/v19.0/oauth/access_token" \
  --data-urlencode "grant_type=fb_exchange_token" \
  --data-urlencode "client_id=$APP_ID" \
  --data-urlencode "client_secret=$APP_SECRET" \
  --data-urlencode "fb_exchange_token=$SHORT_TOKEN")

LONG_TOKEN=$(echo "$LONG_RES" | jq -r '.access_token')

if [ "$LONG_TOKEN" == "null" ] || [ -z "$LONG_TOKEN" ]; then
  echo "❌ Failed to get long-lived user token"
  echo "$LONG_RES"
  exit 1
fi

echo "✅ Long-lived user token obtained"

# ========= STEP 2: Get Page Tokens =========
echo "📄 Fetching pages..."

PAGES_RES=$(curl -s -G "https://graph.facebook.com/v19.0/me/accounts" \
  --data-urlencode "access_token=$LONG_TOKEN")

echo "$PAGES_RES" | jq

# ========= STEP 3: Extract Page Token =========
PAGE_TOKEN=$(echo "$PAGES_RES" | jq -r '.data[0].access_token')
PAGE_NAME=$(echo "$PAGES_RES" | jq -r '.data[0].name')

if [ "$PAGE_TOKEN" == "null" ] || [ -z "$PAGE_TOKEN" ]; then
  echo "❌ No page token found"
  exit 1
fi

echo ""
echo "🎉 SUCCESS"
echo "Page Name: $PAGE_NAME"
echo "Page Access Token:"
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

