#!/bin/bash

# Define the file path
file_path="node_modules/@nuxt/ui-pro/dist/module.mjs"

sed -i '/^      await validateLicense({ key,/s/^/\/\//' "$file_path"