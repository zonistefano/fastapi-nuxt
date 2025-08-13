#!/bin/bash

set -e

# Define colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Welcome to the project!${NC}"

echo -e "${BLUE}Before continuing set CELERY_ENABLED .env variables${NC}".
echo -e "${BLUE}If already done press ENTER, otherwise restart the script${NC}".
read
echo ""

if [ -f .env ]; then
    # Read .env file line by line
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Ignore blank lines and comments
        if [[ ! "$line" =~ ^\s*(#|$) ]]; then
            # Split each line into variable name and value
            IFS='=' read -r varname value <<< "$line"
            # Trim leading and trailing whitespace from the value
            value=$(echo "$value" | xargs)
            # Assign value to variable name
            export "$varname"="$value"
        fi
    done < .env
else
    echo ".env file not found"
fi

echo ""

# Install Frontend dependencies
echo -e "${BLUE}Installing node dependencies...${NC}"
cd frontend 
bun install
cd ..
echo -e "${GREEN}Node dependencies installed!${NC}"

echo ""

# Edit .env file
echo -e "${BLUE}Editing .env file...${NC}"
if [ "${CELERY_ENABLED}" = "True" ]; then
    CELERY="--extra celery"
fi
EXTRAS="${CELERY}"

if grep -q "^PYTHON_EXTRAS" ".env"; then
    sed -i "s/^PYTHON_EXTRAS=.*/PYTHON_EXTRAS=${EXTRAS}/" ".env"
else
    echo "" >> ".env"
    echo "" >> ".env"
    echo "# Python Extra dependencies - Automatically generated, don't touch" >> ".env"
    echo "PYTHON_EXTRAS=${EXTRAS}" >> ".env"
fi
echo -e "${GREEN}.env file edited!${NC}"

echo ""

# Install Python dependencies
echo -e "${BLUE}Installing python dependencies...${NC}"
cd backend && rm uv.lock
eval "uv sync ${EXTRAS}"
source .venv/bin/activate
cd ..
echo -e "${GREEN}Python dependencies installed!${NC}"

echo ""
