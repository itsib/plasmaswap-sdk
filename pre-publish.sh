#!/usr/bin/env bash

# Check registry authorization
res=$(npm whoami 2>&1)
if echo "$res" | grep -q "ENEEDAUTH"; then
    echo -e "\e[31mAuthorization error\e[39m"
    echo -e "Please use 'npm login' to login in your npm registry"
    exit 1
fi


npm run lint
if ! [ $? -eq 0 ]; then
  exit 1
fi

npm run build
if ! [ $? -eq 0 ]; then
  exit 1
fi

node ./node_modules/.bin/bump --tag --push --all
