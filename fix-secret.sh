#!/bin/bash
if [ -f "src/schema/apikey.ts" ]; then
    sed -i 's/sk_test_4eC39HqLyjWDarjtT1zdp7dc/sk_test_xxxxxxxxxxxxxxxxxxxx/g' src/schema/apikey.ts
fi
