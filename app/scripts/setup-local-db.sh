#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Setting up local MySQL for LeadIntel AI...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first:${NC}"
    echo "  sudo apt update && sudo apt install docker.io docker-compose-plugin"
    exit 1
fi

echo -e "${YELLOW}Starting MySQL container...${NC}"
docker compose -f docker-compose.dev.yml up -d --wait

sleep 3

LOCAL_DB_URL="mysql://leadintel:leadintel@localhost:3306/leadintel"

if [ -f .env ]; then
    if grep -q "^DATABASE_URL=" .env; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${LOCAL_DB_URL}|" .env
    else
        echo "DATABASE_URL=${LOCAL_DB_URL}" >> .env
    fi
    echo -e "${GREEN}Updated .env with local database URL${NC}"
else
    echo -e "${RED}.env not found. Creating...${NC}"
    cat > .env << EOF
APP_SECRET=dev-secret-change-me-in-production
DATABASE_URL=${LOCAL_DB_URL}
APP_URL=http://localhost:3000
EOF
fi

echo -e "${YELLOW}Running Drizzle migrations...${NC}"
npx drizzle-kit migrate

echo ""
echo -e "${GREEN}Local database ready!${NC}"
echo -e "  Admin login: ${YELLOW}admin / admin${NC}"
echo ""
echo -e "${GREEN}Start the app:${NC}  npm run dev"
echo -e "${YELLOW}Stop DB:${NC}      docker compose -f docker-compose.dev.yml down"
